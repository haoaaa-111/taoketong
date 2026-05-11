import { describe, it, expect } from '@jest/globals';
import { runSelfChecks, formatViolationsHint } from '@/agents/rule-validator';
import type { StructuredPlanContext, PlanAction } from '@/types';

function makeContext(overrides: Partial<StructuredPlanContext> = {}): StructuredPlanContext {
    return {
        user_profile: {
            risk_tolerance: '中等',
            weekly_skip_target: 2,
            study_mode: '上课学习',
            escape_rush_accept: false,
            constraints: [],
        },
        semester_info: {
            current_week: 5,
            day_of_week: 3,
            is_exam_week: false,
            is_first_week: false,
            total_weeks: 16,
        },
        courses: [],
        ...overrides,
    };
}

function makeAction(scheduleId: number, week: number, action: string): PlanAction {
    return { schedule_id: scheduleId, week, action, reason: 'test' } as PlanAction;
}

describe('Rule 1: 逃课数限制', () => {
    it('should pass when skip count ≤ target', () => {
        const ctx = makeContext({ user_profile: { ...makeContext().user_profile, weekly_skip_target: 3 } });
        const actions = [makeAction(1, 1, '逃课'), makeAction(2, 1, '逃课'), makeAction(3, 1, '上课')];
        const checks = runSelfChecks(actions, ctx);
        const rule1 = checks.find(c => c.rule_id === 1)!;
        expect(rule1.passed).toBe(true);
    });

    it('should fail when skip count > target', () => {
        const ctx = makeContext({ user_profile: { ...makeContext().user_profile, weekly_skip_target: 1 } });
        const actions = [makeAction(1, 1, '逃课'), makeAction(2, 1, '逃课')];
        const checks = runSelfChecks(actions, ctx);
        const rule1 = checks.find(c => c.rule_id === 1)!;
        expect(rule1.passed).toBe(false);
        expect(rule1.violations.length).toBeGreaterThan(0);
    });
});

describe('Rule 2: 高风险专业课保守', () => {
    it('should fail when 逃课 on high-risk 专业课 with 上课学习 mode', () => {
        const ctx = makeContext({
            courses: [{
                schedule_id: 1, course_id: 1, course_name: '高数',
                course_type: '专业课', study_mode: '上课学习',
                schedule_day: 1, schedule_period: '1-2',
                schedule_weeks: [1, 2, 3, 4], is_first_class: false,
                constraints: [],
                risk_result: { risk_level: '高风险', risk_reason: 'test', next_caught_probability: 0.8 },
                rollcall_info: { method: '随机点名', frequency: '经常' },
            }],
        });
        const actions = [makeAction(1, 1, '逃课')];
        const checks = runSelfChecks(actions, ctx);
        const rule2 = checks.find(c => c.rule_id === 2)!;
        expect(rule2.passed).toBe(false);
    });

    it('should pass when 上课 on high-risk 专业课', () => {
        const ctx = makeContext({
            courses: [{
                schedule_id: 1, course_id: 1, course_name: '高数',
                course_type: '专业课', study_mode: '上课学习',
                schedule_day: 1, schedule_period: '1-2',
                schedule_weeks: [1, 2, 3, 4], is_first_class: false,
                constraints: [],
                risk_result: { risk_level: '高风险', risk_reason: 'test', next_caught_probability: 0.8 },
                rollcall_info: { method: '随机点名', frequency: '经常' },
            }],
        });
        const actions = [makeAction(1, 1, '上课')];
        const checks = runSelfChecks(actions, ctx);
        const rule2 = checks.find(c => c.rule_id === 2)!;
        expect(rule2.passed).toBe(true);
    });
});

describe('Rule 3: 签退模式限制', () => {
    it('should fail 签退 when escape_rush_accept is false', () => {
        const ctx = makeContext();
        const actions = [makeAction(1, 1, '签退')];
        const checks = runSelfChecks(actions, ctx);
        const rule3 = checks.find(c => c.rule_id === 3)!;
        expect(rule3.passed).toBe(false);
    });

    it('should pass 签退 when escape_rush_accept is true', () => {
        const ctx = makeContext({
            user_profile: { ...makeContext().user_profile, escape_rush_accept: true },
        });
        const actions = [makeAction(1, 1, '签退')];
        const checks = runSelfChecks(actions, ctx);
        const rule3 = checks.find(c => c.rule_id === 3)!;
        expect(rule3.passed).toBe(true);
    });
});

describe('Rule 4: 期考周保守', () => {
    it('should fail 逃课 during exam week', () => {
        const ctx = makeContext({
            semester_info: { ...makeContext().semester_info, is_exam_week: true },
        });
        const actions = [makeAction(1, 1, '逃课')];
        const checks = runSelfChecks(actions, ctx);
        const rule4 = checks.find(c => c.rule_id === 4)!;
        expect(rule4.passed).toBe(false);
    });
});

describe('Rule 5: 第一次课必到', () => {
    it('should fail 逃课 when is_first_class is true', () => {
        const ctx = makeContext({
            courses: [{
                schedule_id: 1, course_id: 1, course_name: '高数',
                course_type: '专业课', study_mode: '上课学习',
                schedule_day: 1, schedule_period: '1-2',
                schedule_weeks: [1], is_first_class: true,
                constraints: [],
                risk_result: { risk_level: '低风险', risk_reason: 'test', next_caught_probability: 0.1 },
                rollcall_info: { method: '不点名', frequency: '从不' },
            }],
        });
        const actions = [makeAction(1, 1, '逃课')];
        const checks = runSelfChecks(actions, ctx);
        const rule5 = checks.find(c => c.rule_id === 5)!;
        expect(rule5.passed).toBe(false);
    });
});

describe('Rule 6: 第一周保守', () => {
    it('should fail when >1 逃课 in first week', () => {
        const ctx = makeContext({
            semester_info: { ...makeContext().semester_info, is_first_week: true },
        });
        const actions = [makeAction(1, 1, '逃课'), makeAction(2, 1, '逃课')];
        const checks = runSelfChecks(actions, ctx);
        const rule6 = checks.find(c => c.rule_id === 6)!;
        expect(rule6.passed).toBe(false);
    });

    it('should pass when ≤1 逃课 in first week', () => {
        const ctx = makeContext({
            semester_info: { ...makeContext().semester_info, is_first_week: true },
        });
        const actions = [makeAction(1, 1, '逃课'), makeAction(2, 1, '上课')];
        const checks = runSelfChecks(actions, ctx);
        const rule6 = checks.find(c => c.rule_id === 6)!;
        expect(rule6.passed).toBe(true);
    });
});

describe('Rule 7: 用户约束', () => {
    it('should fail when 逃课 on course with 必须到课 constraint', () => {
        const ctx = makeContext({
            courses: [{
                schedule_id: 1, course_id: 1, course_name: '高数',
                course_type: '专业课', study_mode: '上课学习',
                schedule_day: 1, schedule_period: '1-2',
                schedule_weeks: [1, 2, 3, 4], is_first_class: false,
                constraints: ['必须到课'],
                risk_result: { risk_level: '低风险', risk_reason: 'test', next_caught_probability: 0.1 },
                rollcall_info: { method: '不点名', frequency: '从不' },
            }],
        });
        const actions = [makeAction(1, 1, '逃课')];
        const checks = runSelfChecks(actions, ctx);
        const rule7 = checks.find(c => c.rule_id === 7)!;
        expect(rule7.passed).toBe(false);
    });
});

describe('formatViolationsHint', () => {
    it('should return empty string when all checks pass', () => {
        const allPassed = [
            { rule_id: 1, rule_name: 'test', passed: true, violations: [] },
            { rule_id: 2, rule_name: 'test', passed: true, violations: [] },
        ];
        expect(formatViolationsHint(allPassed)).toBe('');
    });

    it('should return formatted hint with violation details', () => {
        const mixed = [
            { rule_id: 1, rule_name: '逃课数限制', passed: false,
              violations: [{ schedule_id: -1, action: '整体', expected_action: '逃课≤2次', reason: '当前3次' }] },
            { rule_id: 2, rule_name: 'test', passed: true, violations: [] },
        ];
        const hint = formatViolationsHint(mixed);
        expect(hint).toContain('逃课数限制');
        expect(hint).toContain('当前3次');
    });
});
