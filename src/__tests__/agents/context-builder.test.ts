import { describe, it, expect } from '@jest/globals';
import { buildPlanContext } from '@/agents/context-builder';

function makeNestedSnapshot(name: string, schedules: Array<{ schedule_id: number; day: number; period: string; weeks: number[] }>) {
    return JSON.stringify({
        name,
        course_type: '专业课',
        study_mode: '上课学习',
        rollcall_methods: [{ method: '抽点', frequency: '偶尔' }],
        schedules,
    });
}

describe('context-builder', () => {
    it('creates one CoursePlanInput per schedule, expanding nested schedules array', () => {
        const courses = [{
            courseId: 1,
            snapshot: makeNestedSnapshot('高数', [
                { schedule_id: 10, day: 2, period: '早一', weeks: [1, 2, 3] },
                { schedule_id: 11, day: 4, period: '午二', weeks: [1, 2, 3] },
            ]),
        }];
        const profile = { weekly_skip_target: 2, escape_rush_accept: false };
        const config = { current_week: 1, current_day_of_week: 1 };
        const riskResults = {
            1: { risk_level: '中风险' as const, confidence: 0.5, components: { rule_based: { risk_level: '中风险' as const, triggered_rules: [], priority: 0 }, bayesian: { probability: 0.3, trend: 'stable' as const }, llm: { risk_level: '中风险' as const, reason: '偶尔点名', key_signals: [] } } },
        };

        const result = buildPlanContext(courses, profile, config, riskResults as never);

        expect(result.courses).toHaveLength(2);
        expect(result.courses[0].schedule_id).toBe(10);
        expect(result.courses[0].schedule_day).toBe(2);
        expect(result.courses[0].schedule_period).toBe('早一');
        expect(result.courses[1].schedule_id).toBe(11);
        expect(result.courses[1].schedule_day).toBe(4);
        expect(result.courses[1].schedule_period).toBe('午二');
        // Both share the same course-level data
        expect(result.courses[0].course_name).toBe('高数');
        expect(result.courses[1].course_name).toBe('高数');
    });

    it('returns empty courses array when snapshot has empty schedules', () => {
        const courses = [{
            courseId: 1,
            snapshot: makeNestedSnapshot('空课程', []),
        }];
        const profile = { weekly_skip_target: 2, escape_rush_accept: false };
        const config = { current_week: 1, current_day_of_week: 1 };
        const riskResults: Record<number, unknown> = {};

        const result = buildPlanContext(courses, profile, config, riskResults as never);

        expect(result.courses).toHaveLength(0);
    });
    it('extractRollcall: should return unknown defaults when rollcall_methods is empty array (line 66 branch)', () => {
        const courses = [
            {
                courseId: 1,
                snapshot: JSON.stringify({
                    name: '测试课程',
                    rollcall_methods: [],
                    schedules: [{ schedule_id: 1, day: 2, period: '早一', weeks: [1] }],
                }),
            },
        ];
        const profile = { weekly_skip_target: 2, escape_rush_accept: false };
        const config = { current_week: 1, current_day_of_week: 1 };
        const riskResults: Record<number, unknown> = {};

        const result = buildPlanContext(courses, profile, config, riskResults as never);

        expect(result.courses).toHaveLength(1);
        expect(result.courses[0].rollcall_info.method).toBe('未知');
        expect(result.courses[0].rollcall_info.frequency).toBe('偶尔');
    });

    it('extractRollcall: should return unknown defaults when rollcall_methods is missing', () => {
        const courses = [
            {
                courseId: 1,
                snapshot: JSON.stringify({
                    name: '测试课程',
                    schedules: [{ schedule_id: 1, day: 2, period: '早一', weeks: [1] }],
                }),
            },
        ];
        const profile = { weekly_skip_target: 2, escape_rush_accept: false };
        const config = { current_week: 1, current_day_of_week: 1 };
        const riskResults: Record<number, unknown> = {};

        const result = buildPlanContext(courses, profile, config, riskResults as never);

        expect(result.courses).toHaveLength(1);
        expect(result.courses[0].rollcall_info.method).toBe('未知');
        expect(result.courses[0].rollcall_info.frequency).toBe('偶尔');
    });
});
