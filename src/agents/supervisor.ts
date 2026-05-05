import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';
import { z } from 'zod';

const SYSTEM_PROMPT = readFileSync(
    process.cwd() + '/prompts/supervisor.md',
    'utf-8'
);

export const SupervisorActionSchema = z.object({
    schedule_id: z.number().int().positive(),
    action: z.enum(['上课', '逃课', '签退']),
    reason: z.string().min(1),
});

export const SupervisorOutputSchema = z.object({
    actions: z.array(SupervisorActionSchema).min(1),
});

export type SupervisorAction = z.infer<typeof SupervisorActionSchema>;
export type SupervisorOutput = z.infer<typeof SupervisorOutputSchema>;

export async function generatePlan(
    promptContext: string
): Promise<SupervisorOutput> {
    const result = await chatCompletionJSON<SupervisorOutput>({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: promptContext,
        temperature: 0.8,
        schema: SupervisorOutputSchema,
    });
    return result;
}
