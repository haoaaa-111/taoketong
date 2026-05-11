import { modelCourseRisk } from './modeler';
import { evaluateRules, BayesianRollcallModel, fuse } from './risk';
import type { RuleContext, FusionResult, RiskLevel } from './risk';

interface SnapshotLike {
    rollcall_model: { primary_method: string };
    schedules: Array<{ weeks: number[] }>;
    caught_history: {
        total: number;
        by_week: Record<string, number>;
    };
    meta: { total_observations: number };
    exam_weeks?: { final?: number };
}

function buildRuleContext(
    snapshot: SnapshotLike,
    currentWeek: number
): RuleContext {
    let frequency = '偶尔';
    try {
        const methods = JSON.parse(snapshot.rollcall_model.primary_method);
        if (Array.isArray(methods) && methods.length > 0) {
            frequency = methods[0].frequency || '偶尔';
        }
    } catch { /* keep default */ }

    const finalExam = snapshot.exam_weeks?.final;
    const isExamWeek = finalExam === currentWeek;
    const weeksToExam = finalExam != null ? finalExam - currentWeek : 999;

    const isFirstClass = snapshot.schedules[0]?.weeks?.[0] === currentWeek;

    return {
        is_exam_week: isExamWeek,
        weeks_to_exam: weeksToExam,
        is_first_class: isFirstClass,
        rollcall_frequency: frequency,
        teacher_attitude: '理解',
        course_type: '专业课',
        times_caught: snapshot.caught_history.total,
        observed_weeks: snapshot.meta.total_observations,
    };
}

const LLM_FALLBACK = {
    risk_level: '中风险' as RiskLevel,
    reason: 'LLM unavailable',
    key_signals: [] as string[],
};

const DOUBLE_FAILURE: FusionResult = {
    risk_level: '中风险',
    confidence: 0.1,
    components: {
        rule_based: { risk_level: '低风险', triggered_rules: [], priority: 0 },
        bayesian: { probability: 0.3, trend: 'stable' },
        llm: { risk_level: '中风险', reason: 'LLM unavailable', key_signals: [] },
    },
};

export async function modelAllCourses(
    courses: Array<{ courseId: number; snapshot: string }>,
    config: { current_week: number }
): Promise<Record<number, FusionResult>> {
    const results: Record<number, FusionResult> = {};

    await Promise.all(courses.map(async (c) => {
        try {
            const snapshot: SnapshotLike = JSON.parse(c.snapshot);
            const ctx = buildRuleContext(snapshot, config.current_week);
            const ruleResult = evaluateRules(ctx);

            const caughtTotal = snapshot.caught_history.total;
            const caughtWeeks = caughtTotal > 0
                ? Array.from({ length: Math.min(caughtTotal, config.current_week) }, (_, i) => config.current_week - 1 - i)
                : [];

            const totalObs = snapshot.meta.total_observations;
            const observedWeeks = totalObs > 0
                ? Array.from({ length: Math.min(totalObs, config.current_week) }, (_, i) => config.current_week - i)
                : [];
            const bayes = BayesianRollcallModel.fromHistory(
                caughtWeeks,
                observedWeeks,
                config.current_week
            );

            let llmComponent;
            try {
                const llmOutput = await modelCourseRisk(c.snapshot);
                llmComponent = {
                    risk_level: llmOutput.risk_level as RiskLevel,
                    reason: llmOutput.risk_reason,
                    key_signals: [] as string[],
                };
            } catch {
                llmComponent = LLM_FALLBACK;
            }

            results[c.courseId] = fuse(
                ruleResult,
                { probability: bayes.expectedProbability(), trend: bayes.trend() },
                llmComponent
            );
        } catch {
            results[c.courseId] = { ...DOUBLE_FAILURE };
        }
    }));

    return results;
}
