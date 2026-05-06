import { describe, it, expect } from '@jest/globals';
import { getAdaptiveTemperature } from '@/agents/supervisor';
import type { StructuredPlanContext } from '@/types';

function ctx(overrides: Partial<StructuredPlanContext> = {}): StructuredPlanContext {
    return {
        user_profile: { risk_tolerance: '中等', weekly_skip_target: 2, study_mode: '上课学习', escape_rush_accept: false, constraints: [] },
        semester_info: { current_week: 5, day_of_week: 3, is_exam_week: false, is_first_week: false, total_weeks: 16 },
        courses: [],
        ...overrides,
    };
}

describe('getAdaptiveTemperature', () => {
    it('should return base temperature (0.8) for normal context', () => {
        const result = getAdaptiveTemperature(ctx());
        expect(result).toBe(0.8);
    });

    it('should cool to ≤0.4 during exam week', () => {
        const examCtx = ctx({
            semester_info: { current_week: 10, day_of_week: 3, is_exam_week: true, is_first_week: false, total_weeks: 16 },
        });
        const result = getAdaptiveTemperature(examCtx);
        expect(result).toBeLessThanOrEqual(0.4);
        expect(result).toBeGreaterThanOrEqual(0.3);
    });

    it('should cool to ≤0.5 during first week', () => {
        const firstWeekCtx = ctx({
            semester_info: { current_week: 1, day_of_week: 3, is_exam_week: false, is_first_week: true, total_weeks: 16 },
        });
        const result = getAdaptiveTemperature(firstWeekCtx);
        expect(result).toBeLessThanOrEqual(0.5);
        expect(result).toBeGreaterThanOrEqual(0.3);
    });

    it('should cool to ≤0.6 when high-risk courses present', () => {
        const highRiskCtx = ctx({
            courses: [{
                schedule_id: 1,
                course_id: 1,
                course_name: '高数',
                course_type: '专业课',
                study_mode: '上课学习',
                schedule_day: 1,
                schedule_period: '1-2',
                schedule_weeks: [1, 2, 3, 4, 5],
                risk_result: {
                    risk_level: '高风险',
                    risk_reason: '经常点名',
                    next_caught_probability: 0.8,
                },
                rollcall_info: {
                    method: '全点名',
                    frequency: '经常',
                },
                is_first_class: false,
                constraints: [],
            }],
        });
        const result = getAdaptiveTemperature(highRiskCtx);
        expect(result).toBeLessThanOrEqual(0.6);
        expect(result).toBeGreaterThanOrEqual(0.3);
    });

    it('should respect custom temperature_modifier as base', () => {
        const customCtx = ctx({
            temperature_modifier: 0.9,
        });
        const result = getAdaptiveTemperature(customCtx);
        expect(result).toBe(0.9);
    });

    it('should floor at 0.3 minimum', () => {
        const extremeCtx = ctx({
            temperature_modifier: 0.2,
        });
        const result = getAdaptiveTemperature(extremeCtx);
        expect(result).toBe(0.3);
    });
});
