import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';
import { z } from 'zod';
import type { StructuredPlanContext } from '@/types';

const SYSTEM_PROMPT = readFileSync(
    process.cwd() + '/prompts/supervisor.md',
    'utf-8'
);

export const SupervisorActionSchema = z.object({
    schedule_id: z.number().int().positive(),
    week: z.number().int().positive().optional(),
    action: z.enum(['上课', '逃课', '签退']),
    reason: z.string().min(1),
});

export const SupervisorOutputSchema = z.object({
    actions: z.array(SupervisorActionSchema).min(1),
});

export type SupervisorAction = z.infer<typeof SupervisorActionSchema>;
export type SupervisorOutput = z.infer<typeof SupervisorOutputSchema>;

export async function generatePlan(
    promptContext: string,
    temperature?: number
): Promise<SupervisorOutput> {
    const result = await chatCompletionJSON<SupervisorOutput>({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: promptContext,
        temperature: temperature ?? 0.8,
        schema: SupervisorOutputSchema,
        circuitKey: 'supervisor',
    });
    return result;
}

export function getAdaptiveTemperature(context: StructuredPlanContext): number {
    const baseTemp = context.temperature_modifier ?? 0.8;
    const MIN = 0.3;

    // Exam week → conservative
    if (context.semester_info.is_exam_week) {
        return Math.max(MIN, Number((baseTemp - 0.4).toFixed(1)));
    }

    // First week → more conservative
    if (context.semester_info.is_first_week) {
        return Math.max(MIN, Number((baseTemp - 0.3).toFixed(1)));
    }

    // High-risk courses → moderate cooling
    const hasHighRisk = context.courses.some(
        c => c.risk_result.risk_level === '高风险'
    );
    if (hasHighRisk) {
        return Math.max(MIN, Number((baseTemp - 0.2).toFixed(1)));
    }

    // Always floor at minimum
    return Math.max(MIN, Number(baseTemp.toFixed(1)));
}
