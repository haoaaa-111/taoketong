import type { StructuredPlanContext, CoursePlanInput, RollcallInfo, ReviewAnswer } from '@/types';
import type { FusionResult } from './risk/fusion-layer';

function parseExamWeeks(data: Record<string, unknown>): { mid?: number; final?: number } | null {
    const raw = data.exam_weeks;
    if (raw === null || raw === undefined || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    return {
        mid: typeof obj.mid === 'number' ? obj.mid : undefined,
        final: typeof obj.final === 'number' ? obj.final : undefined,
    };
}

function parseRollcallMethods(data: Record<string, unknown>): Array<{ method: string; frequency: string }> | undefined {
    const raw = data.rollcall_methods;
    if (!Array.isArray(raw)) return undefined;
    return raw
        .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
        .map(m => ({
            method: typeof m.method === 'string' ? m.method : '未知',
            frequency: typeof m.frequency === 'string' ? m.frequency : '偶尔',
        }));
}

export function buildPlanContext(
    courses: Array<{ courseId: number; snapshot: string }>,
    profile: { weekly_skip_target: number; escape_rush_accept: boolean; plan_weeks?: number },
    config: { current_week: number | null; current_day_of_week: number | null },
    riskResults: Record<number, FusionResult>,
    mustAttendIds?: number[],
    reviewAnswers?: ReviewAnswer[],
): StructuredPlanContext {
    const currentWeek = config.current_week ?? 1;
    const courseInputs: CoursePlanInput[] = courses.flatMap((c) => {
        const data = JSON.parse(c.snapshot);
        const risk = riskResults[c.courseId];
        const schedules = data.schedules;

        if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return [];

        return schedules.map((s: { schedule_id: number; day: number; period: string; weeks: number[] }) => ({
            schedule_id: s.schedule_id,
            course_id: c.courseId,
            course_name: data.name ?? '',
            course_type: data.course_type ?? '专业课',
            study_mode: data.study_mode ?? '上课学习',
            schedule_day: s.day,
            schedule_period: s.period,
            schedule_weeks: s.weeks ?? [],
            risk_result: risk
                ? {
                    risk_level: risk.risk_level,
                    risk_reason: risk.components.llm.reason,
                    next_caught_probability: risk.components.bayesian.probability,
                    confidence: risk.confidence,
                    disagreement_flag: risk.disagreement_flag,
                }
                : { risk_level: '中风险' as const, risk_reason: '待评估', next_caught_probability: 0.3 },
            rollcall_info: extractRollcall(data),
            is_first_class: (s.weeks?.[0] ?? 0) === currentWeek,
            constraints: mustAttendIds?.includes(c.courseId) ? ['必须到课'] : [],
        }));
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
            current_week: currentWeek,
            day_of_week: config.current_day_of_week ?? 1,
            is_exam_week: courseInputs.some(c => {
                const data = JSON.parse(courses.find(x => x.courseId === c.course_id)?.snapshot ?? '{}');
                const ew = parseExamWeeks(data);
                return ew ? Math.abs(currentWeek - (ew.mid ?? 999)) <= 1
                         || Math.abs(currentWeek - (ew.final ?? 999)) <= 1 : false;
            }),
            is_first_week: currentWeek <= 1,
            total_weeks: 16,
        },
        courses: courseInputs,
        plan_weeks: profile.plan_weeks ?? 1,
        review_answers: reviewAnswers,
    };
}

function extractRollcall(data: Record<string, unknown>): RollcallInfo {
    const methods = parseRollcallMethods(data);
    if (methods && methods.length > 0) {
        return { method: methods[0].method, frequency: methods[0].frequency };
    }
    return { method: '未知', frequency: '偶尔' };
}
