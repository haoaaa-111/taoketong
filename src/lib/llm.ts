import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
    if (!client) {
        client = new OpenAI({
            apiKey: process.env.LLM_API_KEY,
            baseURL: process.env.LLM_BASE_URL,
        });
    }
    return client;
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

    const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
    });

    return response.choices[0]?.message?.content || '';
}

export async function chatCompletionJSON(
    options: ChatCompletionOptions,
    retries = 1
): Promise<Record<string, any>> {
    let lastError: Error | null = null;
    for (let i = 0; i <= retries; i++) {
        try {
            const content = await chatCompletion(options);
            const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
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
