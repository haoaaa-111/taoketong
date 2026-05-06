import { describe, it, expect } from '@jest/globals';
import { recordSessionMetrics, getAggregateMetrics, type SessionMetrics } from '@/lib/metrics';

function makeMetrics(overrides: Partial<SessionMetrics> = {}): SessionMetrics {
    return {
        session_id: 'test-session',
        trace_id: 'trace-123',
        duration_ms: 1000,
        phases: {
            context_build_ms: 100, memory_prefetch_ms: 80,
            risk_modeling_ms: 200, plan_generation_ms: 500,
            rule_validation_ms: 50, persistence_ms: 70,
        },
        token_usage: {
            modeler_input: 500, modeler_output: 200,
            supervisor_input: 800, supervisor_output: 300, total: 1800,
        },
        courses_count: 5, courses_failed: 1,
        retry_count: 1, self_check_passed: true,
        temperature_used: 0.6,
        ...overrides,
    };
}

describe('Performance Metrics', () => {
    it('recordSessionMetrics should log without throwing', () => {
        const metrics = makeMetrics();
        expect(() => recordSessionMetrics(metrics)).not.toThrow();
    });

    it('getAggregateMetrics should calculate avg correctly', () => {
        const sessions = [
            makeMetrics({ duration_ms: 1000, token_usage: { ...makeMetrics().token_usage, total: 500 } }),
            makeMetrics({ duration_ms: 2000, token_usage: { ...makeMetrics().token_usage, total: 1500 } }),
        ];
        const agg = getAggregateMetrics(sessions);
        expect(agg.avg_duration_ms).toBe(1500);
        expect(agg.avg_token_usage).toBe(1000);
    });

    it('getAggregateMetrics should handle empty array', () => {
        const agg = getAggregateMetrics([]);
        expect(agg.avg_duration_ms).toBe(0);
        expect(agg.acceptance_rate).toBe(0);
    });

    it('acceptance_rate should reflect self_check_passed ratio', () => {
        const sessions = [
            makeMetrics({ self_check_passed: true }),
            makeMetrics({ self_check_passed: true }),
            makeMetrics({ self_check_passed: false }),
        ];
        const agg = getAggregateMetrics(sessions);
        expect(agg.acceptance_rate).toBeCloseTo(2 / 3, 1);
    });

    it('retry_rate should count sessions with retries', () => {
        const sessions = [
            makeMetrics({ retry_count: 0 }),
            makeMetrics({ retry_count: 2 }),
            makeMetrics({ retry_count: 1 }),
        ];
        const agg = getAggregateMetrics(sessions);
        expect(agg.retry_rate).toBeCloseTo(2 / 3, 1);
    });
});
