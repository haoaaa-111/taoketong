import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';
import { wrapUserInput, SYSTEM_SAFETY_PREFIX } from '@/lib/prompt-safety';
import { z } from 'zod';

const SYSTEM_PROMPT = SYSTEM_SAFETY_PREFIX + readFileSync(
    process.cwd() + '/prompts/memory.md',
    'utf-8'
);

export const MemoryOutputSchema = z.object({
    updates: z.array(z.record(z.string(), z.unknown())),
    summary: z.string(),
    detected_patterns: z.array(z.unknown()).optional(),
    suggested_actions: z.array(z.string()).optional(),
});

export type MemoryOutput = z.infer<typeof MemoryOutputSchema>;

export async function parseUserInput(
    userInput: string
): Promise<MemoryOutput> {
    return await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: wrapUserInput(userInput),
        schema: MemoryOutputSchema,
        circuitKey: 'memory',
    });
}
