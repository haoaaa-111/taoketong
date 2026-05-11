import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the LLM-dependent modeler module
jest.mock('@/agents/modeler', () => ({
    modelCourseRisk: jest.fn(),
    ModelerOutputSchema: {},
}));

import { modelCourseRisk } from '@/agents/modeler';
import { modelAllCourses } from '@/agents/modeler-pool';
import type { FusionResult } from '@/agents/risk/fusion-layer';

function makeSnapshot(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        course_id: 1, name: 'test',
        meta: { version: 1, updated_at: new Date().toISOString(), total_observations: 12, confidence_score: 0.7 },
        schedules: [{ schedule_id: 10, weeks: [1, 2, 3, 4, 5, 6, 7, 8], day: 1, period: '早一' }],
        rollcall_model: { primary_method: '[{"method":"抽点","frequency":"经常"}]', frequency_model: { type: 'poisson', lambda: 0.5, confidence_interval: [0.2, 0.8] }, pattern_detected: false, last_observed_week: 8 },
        caught_history: { total: 3, by_week: {}, trend: 'increasing', bayesian_posterior: { alpha: 4, beta: 10, expected_probability: 0.3 } },
        risk_signals: [], memory_budget: { used_chars: 500, limit_chars: 3000, utilization_pct: 16.7 },
        ...overrides,
    });
}

describe('modelAllCourses', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns FusionResult shape with confidence and components', async () => {
        (modelCourseRisk as jest.Mock).mockResolvedValueOnce({
            risk_level: '低风险',
            risk_reason: '课程看起来安全',
            next_caught_probability: 0.15,
        });

        const result = await modelAllCourses(
            [{ courseId: 1, snapshot: makeSnapshot() }],
            { current_week: 5 }
        );

        const entry = result[1];
        expect(entry).toBeDefined();
        expect(typeof entry.risk_level).toBe('string');
        expect(typeof entry.confidence).toBe('number');
        expect(entry.components).toBeDefined();
        expect(entry.components.rule_based).toBeDefined();
        expect(entry.components.bayesian).toBeDefined();
        expect(entry.components.bayesian.probability).toBeGreaterThanOrEqual(0);
        expect(entry.components.bayesian.probability).toBeLessThanOrEqual(1);
        expect(entry.components.llm).toBeDefined();
        expect(entry.components.llm.risk_level).toBe('低风险');
    });

    it('handles LLM failure with rule+bayes fallback', async () => {
        (modelCourseRisk as jest.Mock).mockRejectedValueOnce(new Error('LLM down'));

        const result = await modelAllCourses(
            [{ courseId: 42, snapshot: makeSnapshot() }],
            { current_week: 5 }
        );

        const entry = result[42];
        expect(entry).toBeDefined();
        expect(entry.components.rule_based).toBeDefined();
        expect(entry.components.bayesian).toBeDefined();
        // Fallback LLM component should exist with default values
        expect(entry.components.llm).toBeDefined();
        expect(entry.components.llm.risk_level).toBe('中风险');
        expect(entry.components.llm.reason).toBe('LLM unavailable');
        expect(entry.confidence).toBeGreaterThan(0);
    });

    it('runs multiple courses in parallel', async () => {
        let callOrder: number[] = [];
        (modelCourseRisk as jest.Mock).mockImplementation(async (snapshot: string) => {
            const parsed = JSON.parse(snapshot);
            callOrder.push(parsed.course_id);
            // Simulate varying delays to prove parallelism
            const delay = parsed.course_id === 1 ? 30 : parsed.course_id === 2 ? 20 : 10;
            await new Promise(r => setTimeout(r, delay));
            return {
                risk_level: '低风险' as const,
                risk_reason: 'ok',
                next_caught_probability: 0.1,
            };
        });

        const snap1 = makeSnapshot({ course_id: 1 });
        const snap2 = makeSnapshot({ course_id: 2 });
        const snap3 = makeSnapshot({ course_id: 3 });

        const start = Date.now();
        const result = await modelAllCourses(
            [
                { courseId: 10, snapshot: snap1 },
                { courseId: 20, snapshot: snap2 },
                { courseId: 30, snapshot: snap3 },
            ],
            { current_week: 5 }
        );
        const elapsed = Date.now() - start;

        // All three should be processed
        expect(result[10]).toBeDefined();
        expect(result[20]).toBeDefined();
        expect(result[30]).toBeDefined();

        // Parallel: total time < sum of individual delays (30+20+10=60ms + overhead)
        expect(elapsed).toBeLessThan(80);
    });

    it('uses caught_history.total when by_week is empty (Bug: caughtWeeks was always [])', async () => {
        // caught_history.total=5 but by_week={} — bug would produce caughtWeeks=[]
        // Fix should generate caughtWeeks from total, using weeks before current_week
        (modelCourseRisk as jest.Mock).mockResolvedValueOnce({
            risk_level: '中风险',
            risk_reason: '中等风险',
            next_caught_probability: 0.2,
        });

        const snap = makeSnapshot({
            caught_history: { total: 5, by_week: {}, trend: 'increasing', bayesian_posterior: { alpha: 1, beta: 1, expected_probability: 0.5 } },
            meta: { version: 1, updated_at: new Date().toISOString(), total_observations: 8, confidence_score: 0.7 },
            schedules: [{ schedule_id: 10, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], day: 1, period: '早一' }],
        });

        const result = await modelAllCourses(
            [{ courseId: 1, snapshot: snap }],
            { current_week: 8 }
        );

        const bayesian = result[1].components.bayesian;
        // With 5 caught out of 8 observed weeks, probability should be > 0.3
        // (Bug: with caughtWeeks=[], probability would be near 0 with 16 schedule weeks)
        expect(bayesian.probability).toBeGreaterThan(0.3);
    });

    it('derives observedWeeks from total_observations, NOT schedule weeks (Bug: schedule weeks used)', async () => {
        // total_observations=2 at current_week=5 means only 2 weeks observed
        // schedule.weeks has 16 entries — bug would use all 16
        // With only 2 observed weeks and 0 caught, prior dominates → probability near 0.5
        // With 16 observed weeks and 0 caught → probability near 0.06
        (modelCourseRisk as jest.Mock).mockResolvedValueOnce({
            risk_level: '低风险',
            risk_reason: '安全',
            next_caught_probability: 0.1,
        });

        const snap = makeSnapshot({
            caught_history: { total: 0, by_week: {}, trend: 'stable', bayesian_posterior: { alpha: 1, beta: 1, expected_probability: 0.5 } },
            meta: { version: 1, updated_at: new Date().toISOString(), total_observations: 2, confidence_score: 0.4 },
            schedules: [{ schedule_id: 10, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], day: 1, period: '早一' }],
        });

        const result = await modelAllCourses(
            [{ courseId: 1, snapshot: snap }],
            { current_week: 5 }
        );

        const bayesian = result[1].components.bayesian;
        // With only 2 observed weeks and 0 caught, prior keeps probability ~0.17
        // Bug: with 16 schedule weeks, probability would be ~0.029
        expect(bayesian.probability).toBeGreaterThan(0.1);
    });

    it('generates disagreement_flag when rule and LLM conflict', async () => {
        // Snapshot with exam_weeks parsed, but no EXAM_PROXIMITY (weeks_to_exam > 1)
        // NEVER_CAUGHT_8WEEKS fires (priority 50, risk='低风险')
        // LLM says 高风险 -> rule_vs_llm conflict with priority < 70
        (modelCourseRisk as jest.Mock).mockResolvedValueOnce({
            risk_level: '高风险',
            risk_reason: 'LLM担忧',
            next_caught_probability: 0.7,
        });

        const snap = makeSnapshot({
            exam_weeks: { final: 8 },
            caught_history: { total: 0, by_week: {}, trend: 'stable', bayesian_posterior: { alpha: 1, beta: 1, expected_probability: 0.5 } },
            meta: { version: 1, updated_at: new Date().toISOString(), total_observations: 12, confidence_score: 0.7 },
        });

        const result = await modelAllCourses(
            [{ courseId: 1, snapshot: snap }],
            { current_week: 3 }
        );

        const entry = result[1];
        expect(entry).toBeDefined();
        expect(entry.disagreement_flag).toBeDefined();
        if (entry.disagreement_flag) {
            expect(entry.disagreement_flag.type).toBe('rule_vs_llm');
        }
    });
});
