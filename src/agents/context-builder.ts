import type { StructuredPlanContext, CoursePlanInput, RiskResult, RollcallInfo } from '@/types';
import type { ModelerOutput } from './modeler';

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
    profile: { weekly_skip_target: number; escape_rush_accept: boolean },
    config: { current_week: number | null; current_day_of_week: number | null },
    riskResults: Record<number, ModelerOutput>,
    mustAttendIds?: number[],
): StructuredPlanContext {
    const currentWeek = config.current_week ?? 1;
    const courseInputs: CoursePlanInput[] = courses.map((c, i) => {
        const data = JSON.parse(c.snapshot);
        const risk = riskResults[c.courseId];
        const examWeeks = parseExamWeeks(data);
        const isExamWeek = examWeeks
            ? Math.abs(currentWeek - (examWeeks.mid ?? 999)) <= 1
                || Math.abs(currentWeek - (examWeeks.final ?? 999)) <= 1
            : false;

        return {
            schedule_id: data.schedule_id ?? i + 1,
            course_id: c.courseId,
            course_name: data.name ?? '',
            course_type: data.course_type ?? '专业课',
            study_mode: data.study_mode ?? '上课学习',
            schedule_day: data.schedule_day ?? 1,
            schedule_period: data.schedule_period ?? '',
            schedule_weeks: data.schedule_weeks ?? [],
            risk_result: risk
                ? { risk_level: risk.risk_level, risk_reason: risk.risk_reason, next_caught_probability: risk.next_caught_probability }
                : { risk_level: '中风险' as const, risk_reason: '待评估', next_caught_probability: 0.3 },
            rollcall_info: extractRollcall(data),
            is_first_class: (data.schedule_weeks?.[0] ?? 0) === currentWeek,
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
    };
}

function extractRollcall(data: Record<string, unknown>): RollcallInfo {
    const methods = parseRollcallMethods(data);
    if (methods && methods.length > 0) {
        return { method: methods[0].method, frequency: methods[0].frequency };
    }
    return { method: '未知', frequency: '偶尔' };
}
