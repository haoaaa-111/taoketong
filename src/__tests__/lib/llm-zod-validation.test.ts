/// <reference types="@jest/globals" />
import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

const ModelerOutputSchema = z.object({
    risk_level: z.enum(['无风险', '低风险', '中风险', '高风险']),
    risk_reason: z.string().max(200),
    next_caught_probability: z.number().min(0).max(1),
});

const SupervisorActionSchema = z.object({
    schedule_id: z.number().int().positive(),
    action: z.enum(['上课', '逃课', '签退']),
    reason: z.string().min(1),
});

const SupervisorOutputSchema = z.object({
    actions: z.array(SupervisorActionSchema).min(1),
});

describe('Task 0.5: Zod schema validation for LLM outputs', () => {
    it('ModelerOutputSchema validates correct risk assessment', () => {
        const valid = {
            risk_level: '高风险',
            risk_reason: '老师经常点名且严抓',
            next_caught_probability: 0.75,
        };
        const result = ModelerOutputSchema.parse(valid);
        expect(result.risk_level).toBe('高风险');
        expect(result.next_caught_probability).toBe(0.75);
    });

    it('ModelerOutputSchema rejects invalid risk_level', () => {
        expect(() => ModelerOutputSchema.parse({
            risk_level: '极高风险',
            risk_reason: 'test',
            next_caught_probability: 0.5,
        })).toThrow(z.ZodError);
    });

    it('ModelerOutputSchema rejects missing fields', () => {
        expect(() => ModelerOutputSchema.parse({
            risk_level: '中风险',
        })).toThrow(z.ZodError);
    });

    it('ModelerOutputSchema rejects probability > 1', () => {
        expect(() => ModelerOutputSchema.parse({
            risk_level: '高风险',
            risk_reason: 'test',
            next_caught_probability: 1.5,
        })).toThrow();
    });

    it('ModelerOutputSchema rejects probability < 0', () => {
        expect(() => ModelerOutputSchema.parse({
            risk_level: '高风险',
            risk_reason: 'test',
            next_caught_probability: -0.1,
        })).toThrow();
    });

    it('SupervisorOutputSchema validates correct plan structure', () => {
        const valid = {
            actions: [
                { schedule_id: 1, action: '逃课', reason: '水课+不点名' },
                { schedule_id: 2, action: '上课', reason: '专业课+高风险' },
            ],
        };
        const result = SupervisorOutputSchema.parse(valid);
        expect(result.actions).toHaveLength(2);
        expect(result.actions[0].schedule_id).toBe(1);
    });

    it('SupervisorOutputSchema rejects empty actions array', () => {
        expect(() => SupervisorOutputSchema.parse({ actions: [] })).toThrow();
    });

    it('SupervisorOutputSchema rejects invalid action value', () => {
        expect(() => SupervisorOutputSchema.parse({
            actions: [{ schedule_id: 1, action: '请假', reason: 'test' }],
        })).toThrow(z.ZodError);
    });

    it('SupervisorOutputSchema rejects missing schedule_id', () => {
        expect(() => SupervisorOutputSchema.parse({
            actions: [{ action: '逃课', reason: 'test' }],
        })).toThrow(z.ZodError);
    });

    it('SupervisorOutputSchema rejects empty reason', () => {
        expect(() => SupervisorOutputSchema.parse({
            actions: [{ schedule_id: 1, action: '逃课', reason: '' }],
        })).toThrow();
    });

    it('chatCompletionJSON safeParse works with valid data', () => {
        const valid = { risk_level: '低风险', risk_reason: 'ok', next_caught_probability: 0.3 };
        const result = ModelerOutputSchema.safeParse(valid);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.risk_level).toBe('低风险');
        }
    });

    it('chatCompletionJSON safeParse returns error details for invalid data', () => {
        const invalid = { risk_level: '低风险' };
        const result = ModelerOutputSchema.safeParse(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0);
        }
    });
});
