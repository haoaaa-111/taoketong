import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync(
    require.resolve('./prompts/memory.md'),
    'utf-8'
);

export async function parseUserInput(
    userInput: string
): Promise<{ updates: any[]; message: string }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: userInput,
    });
    return result as { updates: any[]; message: string };
}
