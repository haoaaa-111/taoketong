import { describe, it, expect } from '@jest/globals';
import { buildPlanContext } from '@/agents/context-builder';

describe('context-builder', () => {
    it('extractRollcall: should return unknown defaults when rollcall_methods is empty array (line 66 branch)', () => {
        const courses = [
            {
                courseId: 1,
                snapshot: JSON.stringify({
                    schedule_id: 1,
                    name: '测试课程',
                    rollcall_methods: [],
                    schedule_weeks: [1],
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
                    schedule_id: 1,
                    name: '测试课程',
                    schedule_weeks: [1],
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
