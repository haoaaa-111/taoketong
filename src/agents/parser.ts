import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync(
    require.resolve('./prompts/parser.md'),
    'utf-8'
);

export async function parseScheduleImage(
    imageBase64: string
): Promise<{ courses: any[]; semester_start?: string; semester_end?: string }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: '请解析这张课表图片',
        imageBase64,
        temperature: 0.3,
    });

    return {
        courses: result.courses || [],
        semester_start: result.semester_start,
        semester_end: result.semester_end,
    };
}
