import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync(
    require.resolve('./prompts/modeler.md'),
    'utf-8'
);

export async function modelCourseRisk(
    courseSnapshot: string
): Promise<{ risk_level: string; risk_reason: string; next_caught_probability: number }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `课程信息：\n\n${courseSnapshot}`,
        temperature: 0.5,
    });
    return result as { risk_level: string; risk_reason: string; next_caught_probability: number };
}
