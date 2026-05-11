import OpenAI from 'openai';
import { z } from 'zod';
import { wrapOpenAIClient } from './langfuse';

let consecutiveFailures = 0;
let circuitBreakerUntil: number | null = null;
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60_000;

const AGENT_ENV_MAP: Record<string, string> = {
    'supervisor': 'SUPERVISOR_LLM_MODEL',
    'modeler': 'MODELER_LLM_MODEL',
    'memory': 'MEMORY_LLM_MODEL',
    'parser': 'PARSER_LLM_MODEL',
    'compressor': 'COMPRESSOR_LLM_MODEL',
    'curator-review': 'CURATOR_LLM_MODEL',
};

let sessionTokens = { input: 0, output: 0 };

export function getAgentModel(circuitKey?: string): string {
    if (circuitKey) {
        const envKey = AGENT_ENV_MAP[circuitKey];
        if (envKey && process.env[envKey]) {
            return process.env[envKey]!;
        }
    }
    return process.env.LLM_MODEL || 'gpt-4o';
}

export function resetSessionTokens(): void {
    sessionTokens = { input: 0, output: 0 };
}

export function getSessionTokens(): { input: number; output: number } {
    return { ...sessionTokens };
}

function checkCircuitBreaker(): void {
    if (circuitBreakerUntil && Date.now() < circuitBreakerUntil) {
        throw new Error('LLM服务暂时不可用，请稍后重试');
    }
    if (circuitBreakerUntil && Date.now() >= circuitBreakerUntil) {
        circuitBreakerUntil = null;
        consecutiveFailures = 0;
    }
}

function recordSuccess(): void {
    consecutiveFailures = 0;
}

function recordFailure(): void {
    consecutiveFailures++;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
        circuitBreakerUntil = Date.now() + COOLDOWN_MS;
    }
}

const MAX_RETRIES = 1;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 5000;
const JITTER_FACTOR = 0.2;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getBackoffDelay(retryCount: number): number {
    const base = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
    const jitter = base * JITTER_FACTOR * (Math.random() * 2 - 1);
    return Math.max(0, base + jitter);
}

let rawClient: OpenAI | null = null;
let wrappedClientPromise: Promise<OpenAI> | null = null;
let tracingModule: typeof import('@langfuse/tracing') | null = null;

function getOpenAIClient(): OpenAI {
    if (!rawClient) {
        rawClient = new OpenAI({
            apiKey: process.env.LLM_API_KEY,
            baseURL: process.env.LLM_BASE_URL,
            timeout: 300_000,
            maxRetries: 0,
        });
    }
    return rawClient;
}

async function getLLMClient(): Promise<OpenAI> {
    if (!wrappedClientPromise) {
        wrappedClientPromise = (async () => {
            return await wrapOpenAIClient(getOpenAIClient());
        })();
    }
    return wrappedClientPromise;
}

async function getTracingModule() {
    if (tracingModule === undefined) {
        try {
            tracingModule = await import('@langfuse/tracing');
        } catch {
            tracingModule = null;
        }
    }
    return tracingModule;
}

export interface ChatCompletionOptions {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    imageBase64?: string;
    schema?: z.ZodType<any>;
    circuitKey?: string;
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
    checkCircuitBreaker();

    const openai = await getLLMClient();
    const model = options.model || getAgentModel(options.circuitKey);
    const agentName = options.circuitKey || 'llm';
    const tracing = await getTracingModule();

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: options.systemPrompt },
    ];

    if (options.imageBase64) {
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: options.userPrompt },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${options.imageBase64}` },
                },
            ],
        });
    } else {
        messages.push({ role: 'user', content: options.userPrompt });
    }

    const doCompletion = async (): Promise<string> => {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                await delay(getBackoffDelay(attempt - 1));
                checkCircuitBreaker();
            }

            try {
                const stream = await openai.chat.completions.create({
                    model,
                    messages,
                    temperature: options.temperature ?? 0.7,
                    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
                    stream: true,
                });

                let content = '';
                let inputTokens = 0, outputTokens = 0;
                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta as Record<string, unknown>;
                    if (typeof delta?.reasoning_content === 'string' && process.env.LLM_DEBUG) {
                        process.stderr.write(delta.reasoning_content as string);
                    }
                    if (typeof delta?.content === 'string') content += delta.content;
                    if (chunk.usage) {
                        inputTokens = chunk.usage.prompt_tokens || 0;
                        outputTokens = chunk.usage.completion_tokens || 0;
                    }
                }

                sessionTokens.input += inputTokens;
                sessionTokens.output += outputTokens;

                recordSuccess();
                return content;
            } catch (e) {
                lastError = e as Error;
                recordFailure();

                const msg = (e as Error).message || '';
                if (msg.includes('524') || msg.includes('timeout') || msg.includes('ETIMEDOUT') ||
                    e instanceof OpenAI.AuthenticationError ||
                    e instanceof OpenAI.BadRequestError) {
                    throw e;
                }
            }
        }

        throw new Error(`LLM调用失败: ${lastError?.message || '未知错误'}`);
    };

    if (tracing) {
        return tracing.startActiveObservation(`llm-${agentName}`, doCompletion);
    }

    return doCompletion();
}

export function extractJSON(text: string): string {
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();

    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) return objectMatch[0].trim();

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) return arrayMatch[0].trim();

    return text.trim();
}

export async function chatCompletionJSON<T = Record<string, any>>(
    options: ChatCompletionOptions,
    retries = 1
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
        try {
            const content = await chatCompletion(options);
            const extracted = extractJSON(content);
            let parsed: any;
            try {
                parsed = JSON.parse(extracted);
            } catch {
                throw new Error(`Failed to parse JSON from LLM output: ${extracted.substring(0, 200)}`);
            }
            
            const schema = options.schema;
            if (schema) {
                const result = schema.safeParse(parsed);
                if (!result.success) {
                    throw new LLMOutputValidationError(
                        `LLM output failed Zod validation for circuit: ${options.circuitKey || 'unknown'}`,
                        {
                            zodErrors: result.error.issues,
                            receivedData: parsed,
                        }
                    );
                }
                return result.data as T;
            }
            
            return parsed as T;
        } catch (e) {
            lastError = e as Error;
            const msg = (e as Error).message || '';
            if (msg.includes('524') || msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
                throw e;
            }
        }
    }

    throw new Error(`JSON parsing/validation failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

export class LLMOutputValidationError extends Error {
    constructor(
        message: string,
        public readonly details: Record<string, unknown>
    ) {
        super(message);
        this.name = 'LLMOutputValidationError';
    }
}
