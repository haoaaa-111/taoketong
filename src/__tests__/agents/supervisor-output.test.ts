import { describe, it, expect } from '@jest/globals';
import type { SupervisorOutput, DecisionRationale, GenerationMeta } from '@/types';

describe('SupervisorOutput v2', () => {
    it('should include meta with generation attempt and temperature', () => {
        const output: SupervisorOutput = {
            actions: [{ schedule_id: 1, action: '上课', reason: 'test' }],
            meta: {
                generation_attempt: 2,
                temperature_used: 0.6,
                self_check_passed: true,
                generation_confidence: 0.85,
                token_usage: { input: 1500, output: 200 },
            },
            decision_rationale: [
                { schedule_id: 1, action: '上课', primary_factor: '高风险', supporting_factors: ['专业课', '考试临近'], risk_level: '高风险' },
            ],
        };

        expect(output.meta.generation_attempt).toBe(2);
        expect(output.meta.self_check_passed).toBe(true);
        expect(output.decision_rationale).toHaveLength(1);
        expect(output.decision_rationale[0].primary_factor).toBe('高风险');
    });

    it('GenerationMeta should require self_check_passed and token_usage', () => {
        const meta: GenerationMeta = {
            generation_attempt: 1,
            temperature_used: 0.8,
            self_check_passed: true,
            generation_confidence: 0.9,
            token_usage: { input: 1000, output: 150 },
        };
        expect(meta.self_check_passed).toBe(true);
        expect(meta.token_usage.input).toBeGreaterThan(0);
        expect(meta.token_usage.output).toBeGreaterThan(0);
    });

    it('DecisionRationale should include primary_factor and supporting_factors', () => {
        const rationale: DecisionRationale = {
            schedule_id: 1,
            action: '逃课',
            primary_factor: '低风险',
            supporting_factors: ['水课', '从不点名', '无考试'],
            risk_level: '低风险',
        };
        expect(rationale.primary_factor).toBe('低风险');
        expect(rationale.supporting_factors).toContain('水课');
        expect(rationale.risk_level).toBe('低风险');
    });

    it('should support optional self_check_violations in GenerationMeta', () => {
        const meta: GenerationMeta = {
            generation_attempt: 3,
            temperature_used: 0.4,
            self_check_passed: false,
            generation_confidence: 0.5,
            token_usage: { input: 2000, output: 300 },
            self_check_violations: [
                { rule_id: 1, rule_name: '逃课数限制', passed: false, violations: [] },
            ],
        };
        expect(meta.self_check_passed).toBe(false);
        expect(meta.self_check_violations).toHaveLength(1);
    });
});
