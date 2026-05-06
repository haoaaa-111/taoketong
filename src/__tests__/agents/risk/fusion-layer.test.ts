import { describe, it, expect } from '@jest/globals';
import { fuse } from '@/agents/risk/fusion-layer';
import type { RuleResult } from '@/agents/risk/rule-engine';

describe('Fusion Layer', () => {
    const baseRule: RuleResult = { risk_level: '中风险', triggered_rules: ['TEST'], priority: 50 };
    const baseBayes = { probability: 0.3, trend: 'stable' as const };
    const baseLLM = { risk_level: '中风险' as const, reason: 'test' };

    it('should use rule result when priority ≥ 70', () => {
        const result = fuse(
            { ...baseRule, risk_level: '高风险', priority: 80 },
            baseBayes,
            baseLLM
        );
        expect(result.risk_level).toBe('高风险');
        expect(result.disagreement_flag).toBeUndefined();
    });

    it('should use LLM result when priority < 70', () => {
        const result = fuse(
            { ...baseRule, risk_level: '低风险', priority: 30 },
            baseBayes,
            { ...baseLLM, risk_level: '高风险' }
        );
        expect(result.risk_level).toBe('高风险');
    });

    it('should detect all_conflict when all 3 sources disagree', () => {
        const result = fuse(
            { ...baseRule, risk_level: '低风险', priority: 30 },
            { probability: 0.6, trend: 'increasing' },
            { risk_level: '高风险', reason: 'test' }
        );
        expect(result.disagreement_flag).toBeDefined();
        expect(result.disagreement_flag!.type).toBe('all_conflict');
        expect(result.disagreement_flag!.resolution).toBe('needs_review');
    });

    it('should not flag disagreement when sources agree', () => {
        const result = fuse(
            { ...baseRule, risk_level: '中风险', priority: 50 },
            { probability: 0.35, trend: 'stable' },
            { risk_level: '中风险', reason: 'test' }
        );
        expect(result.disagreement_flag).toBeUndefined();
    });
});
