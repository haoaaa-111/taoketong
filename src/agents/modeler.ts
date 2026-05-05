import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';
import { z } from 'zod';

const SYSTEM_PROMPT = readFileSync(
    process.cwd() + '/prompts/modeler.md',
    'utf-8'
);

export const ModelerOutputSchema = z.object({
    risk_level: z.enum(['无风险', '低风险', '中风险', '高风险']),
    risk_reason: z.string().max(200),
    next_caught_probability: z.number().min(0).max(1),
});

export type ModelerOutput = z.infer<typeof ModelerOutputSchema>;

export async function modelCourseRisk(
    courseSnapshot: string
): Promise<ModelerOutput> {
    const result = await chatCompletionJSON<ModelerOutput>({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `课程信息：\n\n${courseSnapshot}`,
        temperature: 0.5,
        schema: ModelerOutputSchema,
    });
    return result;
}
