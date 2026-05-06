import type { StructuredPlanContext, CoursePlanInput } from '@/types';
import * as dbProfile from '@/db/profile';

export function buildPlanContext(
    courses: Array<{ courseId: number; snapshot: string }>,
    profile: ReturnType<typeof dbProfile.ensureProfileExists>,
    config: ReturnType<typeof dbProfile.ensureConfigExists>,
    mustAttendIds?: number[],
): StructuredPlanContext {
    const courseInputs: CoursePlanInput[] = courses.map((c, i) => {
        const data = JSON.parse(c.snapshot);
        return {
            schedule_id: data.schedule_id ?? i + 1,
            course_id: c.courseId,
            course_name: data.name ?? '',
            course_type: data.course_type ?? '专业课',
            study_mode: data.study_mode ?? '上课学习',
            schedule_day: data.schedule_day ?? 1,
            schedule_period: data.schedule_period ?? '',
            schedule_weeks: data.schedule_weeks ?? [],
            risk_result: { risk_level: '中风险', risk_reason: '待评估', next_caught_probability: 0.3 },
            rollcall_info: { method: '未知', frequency: '偶尔' },
            is_first_class: false,
            constraints: mustAttendIds?.includes(c.courseId) ? ['必须到课'] : [],
        };
    });

    return {
        user_profile: {
            risk_tolerance: '中等',
            weekly_skip_target: profile.weekly_skip_target ?? 2,
            study_mode: '上课学习',
            escape_rush_accept: profile.escape_rush_accept ?? false,
            constraints: [],
        },
        semester_info: {
            current_week: config.current_week ?? 1,
            day_of_week: config.current_day_of_week ?? 1,
            is_exam_week: false,
            is_first_week: (config.current_week ?? 1) <= 1,
            total_weeks: 16,
        },
        courses: courseInputs,
    };
}
