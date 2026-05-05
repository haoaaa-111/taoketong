import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';
import { wrapUserInput, SYSTEM_SAFETY_PREFIX } from '@/lib/prompt-safety';
import { z } from 'zod';

const SYSTEM_PROMPT = SYSTEM_SAFETY_PREFIX + readFileSync(
    process.cwd() + '/prompts/memory.md',
    'utf-8'
);

const MemoryUpdateSchema = z.object({
    course_name: z.string().min(1),
    fields_to_update: z.record(z.string(), z.unknown()),
    confidence: z.number().min(0).max(1),
    requires_verification: z.boolean(),
    update_type: z.enum(['fact', 'inference', 'correction']),
});

const MemoryParseResultSchema = z.object({
    updates: z.array(MemoryUpdateSchema),
    summary: z.string(),
    detected_patterns: z.array(z.string()).optional(),
    suggested_actions: z.array(z.string()).optional(),
});

export type MemoryUpdate = z.infer<typeof MemoryUpdateSchema>;
export type MemoryParseResult = z.infer<typeof MemoryParseResultSchema>;

export async function parseUserInput(userText: string): Promise<MemoryParseResult> {
    if (!userText || userText.trim().length === 0) {
        return {
            updates: [],
            summary: '用户未提供反馈内容',
        };
    }

    const rawResult = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: wrapUserInput(userText),
        temperature: 0.3,
        circuitKey: 'memory-agent',
        schema: MemoryParseResultSchema,
    });

    return rawResult as MemoryParseResult;
}
