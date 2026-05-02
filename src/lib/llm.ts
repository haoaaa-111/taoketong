import OpenAI from 'openai';
import { observeOpenAI } from '@langfuse/openai';

let consecutiveFailures = 0;
let circuitBreakerUntil: number | null = null;
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60_000;

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

const MAX_RETRIES = 3;
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

let openaiClient: OpenAI | null = null;

export function getLLMClient(): OpenAI {
    if (!openaiClient) {
        const baseClient = new OpenAI({
            apiKey: process.env.LLM_API_KEY,
            baseURL: process.env.LLM_BASE_URL,
            timeout: 30_000,
            maxRetries: 0,
        });

        if (process.env.LANGFUSE_SECRET_KEY) {
            openaiClient = observeOpenAI(baseClient);
        } else {
            openaiClient = baseClient;
        }
    }
    return openaiClient;
}

export interface ChatCompletionOptions {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    imageBase64?: string;
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
    checkCircuitBreaker();

    const openai = getLLMClient();
    const model = options.model || process.env.LLM_MODEL || 'gpt-4o';

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

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            await delay(getBackoffDelay(attempt - 1));
            checkCircuitBreaker();
        }

        try {
            const response = await openai.chat.completions.create({
                model,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096,
            });

            const content = response.choices[0]?.message?.content || '';
            recordSuccess();
            return content;
        } catch (e) {
            lastError = e as Error;
            recordFailure();

            if (e instanceof OpenAI.AuthenticationError ||
                e instanceof OpenAI.BadRequestError) {
                throw e;
            }
        }
    }

    throw new Error(`LLM调用失败: ${lastError?.message || '未知错误'}`);
}

export async function chatCompletionJSON(
    options: ChatCompletionOptions,
    retries = 1
): Promise<Record<string, any>> {
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
        try {
            const content = await chatCompletion(options);
            const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) ||
                              content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1] || jsonMatch[0]);
            }
            return JSON.parse(content);
        } catch (e) {
            lastError = e as Error;
        }
    }

    throw new Error(`JSON解析失败: ${lastError?.message}`);
}
