import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/agents/supervisor', () => ({
    generatePlan: jest.fn(),
    getAdaptiveTemperature: jest.fn(() => 0.8),
}));

jest.mock('@/db/memory', () => ({
    getAllCourseSnapshots: jest.fn(() => [
        { course_id: 1, course_name: 'Course A', snapshot_data: '{"name":"Course A","course_type":"水课","study_mode":"上课学习","schedules":[{"schedule_id":1,"day":1,"period":"早一","weeks":[1,2,3]}]}' },
    ]),
    updateCourseMemory: jest.fn(),
}));

jest.mock('@/db/profile', () => ({
    ensureProfileExists: jest.fn(() => ({
        id: 1, plan_weeks: 1, skip_motivation: [],
        weekly_skip_target: 3, escape_rush_accept: true,
        has_completed_onboarding: true,
        created_at: '', updated_at: '',
    })),
    ensureConfigExists: jest.fn(() => ({
        id: 1, current_week: 5, current_day_of_week: 3,
        created_at: '', updated_at: '',
    })),
}));

jest.mock('@/db/sessions', () => ({
    getLatestSession: jest.fn(() => null),
    rejectLatestSession: jest.fn(),
    createSession: jest.fn(() => 1),
    insertAction: jest.fn(() => 100),
}));

jest.mock('@/db', () => ({
    db: { transaction: jest.fn((fn: () => any) => () => fn()) },
}));

jest.mock('@/agents/modeler-pool', () => ({
    modelAllCourses: jest.fn(),
}));

jest.mock('@/agents/context-builder', () => ({
    buildPlanContext: jest.fn(),
}));

jest.mock('@/agents/rule-validator', () => ({
    runSelfChecks: jest.fn(),
    formatViolationsHint: jest.fn(),
}));

jest.mock('@/agents/prompt-builder', () => ({
    buildSupervisorSystemPrompt: jest.fn(() => 'mock-prompt'),
}));

jest.mock('@/agents/reviewer', () => ({
    reviewContext: jest.fn(),
}));

jest.mock('@/agents/session-error', () => {
    class SessionGenerationError extends Error {
        details: { code: string; suggestion: string };
        constructor(message: string, details: { code: string; suggestion: string }) {
            super(message);
            this.name = 'SessionGenerationError';
            this.details = details;
        }
    }
    return { SessionGenerationError };
});

jest.mock('@/lib/llm', () => ({
    resetSessionTokens: jest.fn(),
    getSessionTokens: jest.fn(() => ({ input: 100, output: 200 })),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    setTraceId: jest.fn(),
}));

jest.mock('@/lib/metrics', () => ({
    recordSessionMetrics: jest.fn(),
}));

const MOCK_CONTEXT = {
    user_profile: {
        risk_tolerance: '中等', weekly_skip_target: 3,
        study_mode: '上课学习', escape_rush_accept: true, constraints: [],
    },
    semester_info: {
        current_week: 5, day_of_week: 3,
        is_exam_week: false, is_first_week: false, total_weeks: 16,
    },
    courses: [],
};

const ALL_PASSED = [
    { rule_id: 1, rule_name: 'r1', passed: true, violations: [] },
];

describe('Orchestrator review integration', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        const { modelAllCourses } = await import('@/agents/modeler-pool');
        const { buildPlanContext } = await import('@/agents/context-builder');
        const { generatePlan } = await import('@/agents/supervisor');
        const { runSelfChecks } = await import('@/agents/rule-validator');
        const { reviewContext } = await import('@/agents/reviewer');

        (modelAllCourses as jest.Mock).mockResolvedValue({ 1: { risk_level: '低风险', risk_reason: 'ok', next_caught_probability: 0.1, components: { llm: { reason: '' }, bayesian: { probability: 0.1 } }, confidence: 0.9 } });
        (buildPlanContext as jest.Mock).mockReturnValue(MOCK_CONTEXT);
        (generatePlan as jest.Mock).mockResolvedValue({ actions: [{ schedule_id: 1, week: 1, action: '上课', reason: 'ok' }] });
        (runSelfChecks as jest.Mock).mockReturnValue(ALL_PASSED);
        (reviewContext as jest.Mock).mockResolvedValue({ is_sufficient: true, assessment: 'ok', questions: [] });
    });

    it('when reviewer says sufficient, returns plan normally', async () => {
        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(result.status).toBe('ok');
        expect(result.session_id).toBeGreaterThan(0);
        expect(result.actions).toHaveLength(1);
    });

    it('when reviewer says not sufficient, returns needs_review with questions', async () => {
        const { reviewContext } = await import('@/agents/reviewer');
        (reviewContext as jest.Mock).mockResolvedValue({
            is_sufficient: false,
            assessment: '信息不足',
            questions: [{ id: 'q1', text: 'Q?', context: 'ctx', type: 'choice', options: ['A', 'B'] }],
        });

        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(result.status).toBe('needs_review');
        expect(result.review).toBeDefined();
        expect(result.review!.questions).toHaveLength(1);
        expect(result.session_id).toBeNull();
        expect(result.actions).toHaveLength(0);
    });

    it('when reviewer fails, falls through to plan generation (fail-safe)', async () => {
        const { reviewContext } = await import('@/agents/reviewer');
        (reviewContext as jest.Mock).mockResolvedValue({
            is_sufficient: true,
            assessment: '审查步骤跳过',
            questions: [],
        });

        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(result.status).toBe('ok');
        expect(result.session_id).toBeGreaterThan(0);
    });

    it('review_id is returned when review is needed', async () => {
        const { reviewContext } = await import('@/agents/reviewer');
        (reviewContext as jest.Mock).mockResolvedValue({
            is_sufficient: false,
            assessment: 'gap',
            questions: [{ id: 'q1', text: 'Q?', context: 'ctx', type: 'open' }],
        });

        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(result.review_id).toBeDefined();
        expect(typeof result.review_id).toBe('string');
        expect(result.review_id!.length).toBeGreaterThan(0);
    });

    it('when review_answers provided, skips review and generates plan', async () => {
        const { reviewContext } = await import('@/agents/reviewer');

        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({
            review_answers: [{ question_id: 'q1', answer: 'It is a water course' }],
        });

        expect(reviewContext).not.toHaveBeenCalled();
        expect(result.status).toBe('ok');
        expect(result.session_id).toBeGreaterThan(0);
    });
});
