import { describe, it, expect } from '@jest/globals';
import type {
    StructuredPlanContext,
    CoursePlanInput,
    RiskResult,
} from '@/types';

describe('StructuredPlanContext types', () => {
    it('CoursePlanInput should require schedule_id and risk_result', () => {
        const input: CoursePlanInput = {
            schedule_id: 1,
            course_id: 1,
            course_name: '高数',
            course_type: '专业课',
            study_mode: '上课学习',
            schedule_day: 1,
            schedule_period: '1-2',
            schedule_weeks: [1, 2, 3, 4, 5, 6, 7, 8],
            risk_result: {
                risk_level: '中风险',
                risk_reason: '偶尔点名',
                next_caught_probability: 0.3,
            },
            rollcall_info: {
                method: '随机点名',
                frequency: '偶尔',
                last_caught_week: 3,
            },
            is_first_class: false,
            constraints: [],
        };

        expect(input.schedule_id).toBe(1);
        expect(input.risk_result.risk_level).toBe('中风险');
    });

    it('StructuredPlanContext should include user_profile, semester_info, courses', () => {
        const ctx: StructuredPlanContext = {
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
        };

        expect(ctx.user_profile.risk_tolerance).toBe('中等');
        expect(ctx.semester_info.current_week).toBe(5);
    });

    it('StructuredPlanContext should support overrides', () => {
        const ctx: StructuredPlanContext = {
            user_profile: {
                risk_tolerance: '高',
                weekly_skip_target: 3,
                study_mode: '上课学习',
                escape_rush_accept: true,
                constraints: [],
            },
            semester_info: {
                current_week: 1,
                day_of_week: 1,
                is_exam_week: false,
                is_first_week: true,
                total_weeks: 18,
            },
            courses: [],
            overrides: {
                must_attend_schedule_ids: [1, 2],
                skip_schedule_ids: [3],
            },
            retry_hint: '请增加高数到课上',
            temperature_modifier: 0.6,
        };

        expect(ctx.overrides!.must_attend_schedule_ids).toContain(1);
        expect(ctx.retry_hint).toBeDefined();
    });
});
