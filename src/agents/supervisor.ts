import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync(
    process.cwd() + '/prompts/supervisor.md',
    'utf-8'
);

export async function generatePlan(
    promptContext: string
): Promise<{ actions: { schedule_id: number; action: string; reason: string }[] }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: promptContext,
        temperature: 0.8,
    });
    return result as { actions: { schedule_id: number; action: string; reason: string }[] };
}
