import { describe, it, expect } from '@jest/globals';
import { evaluateRules, type RuleContext } from '@/agents/risk/rule-engine';

function makeCtx(overrides: Partial<RuleContext> = {}): RuleContext {
    return {
        is_exam_week: false, weeks_to_exam: 5, is_first_class: false,
        rollcall_frequency: '偶尔', teacher_attitude: '中等',
        course_type: '专业课', times_caught: 0, observed_weeks: 10,
        ...overrides,
    };
}

describe('Rule Engine', () => {
    it('should trigger EXAM_PROXIMITY and set 高风险 during exam week', () => {
        const result = evaluateRules(makeCtx({ is_exam_week: true }));
        expect(result.risk_level).toBe('高风险');
        expect(result.triggered_rules).toContain('EXAM_PROXIMITY');
        expect(result.priority).toBe(90);
    });

    it('should trigger FIRST_CLASS on first class', () => {
        const result = evaluateRules(makeCtx({ is_first_class: true }));
        expect(result.risk_level).toBe('高风险');
        expect(result.triggered_rules).toContain('FIRST_CLASS');
    });

    it('should trigger FREQUENT_ROLLCALL_STRICT for strict teacher', () => {
        const result = evaluateRules(makeCtx({ rollcall_frequency: '经常', teacher_attitude: '严抓' }));
        expect(result.risk_level).toBe('高风险');
        expect(result.triggered_rules).toContain('FREQUENT_ROLLCALL_STRICT');
    });

    it('should trigger EASY_COURSE_LAZY_TEACHER for 水课', () => {
        const result = evaluateRules(makeCtx({ course_type: '水课', teacher_attitude: '懒得管' }));
        expect(result.risk_level).toBe('低风险');
        expect(result.triggered_rules).toContain('EASY_COURSE_LAZY_TEACHER');
    });

    it('should trigger NEVER_CAUGHT_8WEEKS with no catches', () => {
        const result = evaluateRules(makeCtx({ times_caught: 0, observed_weeks: 10 }));
        expect(result.triggered_rules).toContain('NEVER_CAUGHT_8WEEKS');
    });

    it('should return default 低风险 for normal context', () => {
        const result = evaluateRules(makeCtx());
        expect(result.risk_level).toBe('低风险');
    });
});
