import { logger } from './logger';

export interface SessionMetrics {
    session_id: string;
    trace_id: string;
    duration_ms: number;
    phases: {
        context_build_ms: number;
        memory_prefetch_ms: number;
        risk_modeling_ms: number;
        plan_generation_ms: number;
        rule_validation_ms: number;
        persistence_ms: number;
    };
    token_usage: {
        modeler_input: number;
        modeler_output: number;
        supervisor_input: number;
        supervisor_output: number;
        total: number;
    };
    courses_count: number;
    courses_failed: number;
    retry_count: number;
    self_check_passed: boolean;
    temperature_used: number;
}

export function recordSessionMetrics(metrics: SessionMetrics): void {
    logger.info('SessionMetrics', 'session_complete', metrics);
}

export function getAggregateMetrics(sessions: SessionMetrics[]): {
    avg_duration_ms: number;
    p95_duration_ms: number;
    avg_token_usage: number;
    acceptance_rate: number;
    retry_rate: number;
} {
    if (sessions.length === 0) {
        return { avg_duration_ms: 0, p95_duration_ms: 0, avg_token_usage: 0, acceptance_rate: 0, retry_rate: 0 };
    }
    const durations = sessions.map(s => s.duration_ms).sort((a, b) => a - b);
    const p95Index = Math.ceil(durations.length * 0.95) - 1;
    return {
        avg_duration_ms: durations.reduce((a, b) => a + b, 0) / durations.length,
        p95_duration_ms: durations[Math.max(0, p95Index)] || durations[durations.length - 1],
        avg_token_usage: sessions.reduce((a, s) => a + s.token_usage.total, 0) / sessions.length,
        acceptance_rate: sessions.filter(s => s.self_check_passed).length / sessions.length,
        retry_rate: sessions.filter(s => s.retry_count > 0).length / sessions.length,
    };
}
