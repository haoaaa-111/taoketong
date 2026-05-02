import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';
import { wrapUserInput, SYSTEM_SAFETY_PREFIX } from '@/lib/prompt-safety';

const SYSTEM_PROMPT = SYSTEM_SAFETY_PREFIX + readFileSync(
    process.cwd() + '/prompts/memory.md',
    'utf-8'
);

export async function parseUserInput(
    userInput: string
): Promise<{ updates: any[]; message: string }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: wrapUserInput(userInput),
    });
    return result as { updates: any[]; message: string };
}
