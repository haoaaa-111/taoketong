import { describe, it, expect, jest } from '@jest/globals';

// ── Mock ALL dependencies at module level (same pattern as orchestrator-modeler-isolation.test.ts) ──

jest.mock('@/agents/supervisor', () => ({
    generatePlan: jest.fn(),
    getAdaptiveTemperature: jest.fn(() => 0.8),
}));

jest.mock('@/db/memory', () => ({
    getAllCourseSnapshots: jest.fn(() => [
        { courseId: 1, snapshot: '{"name":"Course A","schedule_id":1,"schedule_day":1,"schedule_period":"早一","schedule_weeks":[1,2,3],"course_type":"水课","study_mode":"上课学习"}' },
        { courseId: 2, snapshot: '{"name":"Course B","schedule_id":2,"schedule_day":2,"schedule_period":"午一","schedule_weeks":[1,2,3],"course_type":"专业课","study_mode":"上课学习"}' },
    ]),
    updateCourseMemory: jest.fn(),
}));

jest.mock('@/db/profile', () => ({
    ensureProfileExists: jest.fn(() => ({
        id: 1, plan_weeks: 1, skip_motivation: [],
        plan_start_date: null, weekly_skip_habit: 0,
        weekly_skip_target: 3, sub_cost_max: 30,
        escape_rush_accept: true, commute_cost_minutes: 10,
        has_completed_onboarding: true,
        created_at: '', updated_at: '',
    })),
    ensureConfigExists: jest.fn(() => ({
        id: 1, current_week: 5, current_day_of_week: 3,
        semester_start_date: '2026-01-01', semester_end_date: '2026-06-30',
        created_at: '', updated_at: '',
    })),
}));

jest.mock('@/db/sessions', () => ({
    getLatestSession: jest.fn(() => null),
    rejectLatestSession: jest.fn(),
    createSession: jest.fn(() => 1),
    insertAction: jest.fn((data: any) => 100 + data.schedule_id),
}));

jest.mock('@/db', () => ({
    db: {
        transaction: jest.fn((fn: () => any) => {
            return () => fn();
        }),
    },
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
    buildSupervisorSystemPrompt: jest.fn(() => 'mock-system-prompt'),
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

// ── Shared mock context ──

const DEFAULT_RISK = {
    risk_level: '中风险' as const,
    risk_reason: '无法获取风险评估（降级默认值）',
    next_caught_probability: 0.3,
};

const DEFAULT_RISK_LOW = {
    risk_level: '低风险' as const,
    risk_reason: 'Mocked assessment',
    next_caught_probability: 0.1,
};

const MOCK_CONTEXT = {
    user_profile: {
        risk_tolerance: '中等',
        weekly_skip_target: 3,
        study_mode: '上课学习',
        escape_rush_accept: true,
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

const ALL_PASSED_CHECKS = [
    { rule_id: 1, rule_name: '逃课数限制', passed: true, violations: [] },
    { rule_id: 2, rule_name: '高风险专业课保守', passed: true, violations: [] },
    { rule_id: 3, rule_name: '签退模式限制', passed: true, violations: [] },
    { rule_id: 4, rule_name: '期考周保守', passed: true, violations: [] },
    { rule_id: 5, rule_name: '第一次课必到', passed: true, violations: [] },
    { rule_id: 6, rule_name: '第一周保守', passed: true, violations: [] },
    { rule_id: 7, rule_name: '用户约束', passed: true, violations: [] },
];

const ONE_FAILED_CHECK = [
    { rule_id: 1, rule_name: '逃课数限制', passed: false, violations: [{ schedule_id: -1, action: '整体', expected_action: '逃课≤3次', reason: '当前5次' }] },
    { rule_id: 2, rule_name: '高风险专业课保守', passed: true, violations: [] },
];

// ── Tests ──

describe('Full pipeline integration', () => {

    beforeEach(async () => {
        const { modelAllCourses } = await import('@/agents/modeler-pool');
        const { buildPlanContext } = await import('@/agents/context-builder');
        const { generatePlan } = await import('@/agents/supervisor');
        const { runSelfChecks } = await import('@/agents/rule-validator');
        const { formatViolationsHint } = await import('@/agents/rule-validator');
        const { getAllCourseSnapshots } = await import('@/db/memory');
        const { getLatestSession, createSession, insertAction } = await import('@/db/sessions');
        const { buildSupervisorSystemPrompt } = await import('@/agents/prompt-builder');

        (modelAllCourses as jest.Mock).mockReset();
        (buildPlanContext as jest.Mock).mockReset();
        (generatePlan as jest.Mock).mockReset();
        (runSelfChecks as jest.Mock).mockReset();
        (formatViolationsHint as jest.Mock).mockReset();
        (getAllCourseSnapshots as jest.Mock).mockReset();
        (getLatestSession as jest.Mock).mockReset();
        (createSession as jest.Mock).mockReset();
        (insertAction as jest.Mock).mockReset();
        (buildSupervisorSystemPrompt as jest.Mock).mockReset();

        (getAllCourseSnapshots as jest.Mock).mockReturnValue([
            { courseId: 1, snapshot: '{"name":"Course A","schedule_id":1,"schedule_day":1,"schedule_period":"早一","schedule_weeks":[1,2,3],"course_type":"水课","study_mode":"上课学习"}' },
            { courseId: 2, snapshot: '{"name":"Course B","schedule_id":2,"schedule_day":2,"schedule_period":"午一","schedule_weeks":[1,2,3],"course_type":"专业课","study_mode":"上课学习"}' },
        ]);
        (getLatestSession as jest.Mock).mockReturnValue(null);
        (createSession as jest.Mock).mockReturnValue(1);
        (insertAction as jest.Mock).mockImplementation((data: any) => 100 + data.schedule_id);
        (buildSupervisorSystemPrompt as jest.Mock).mockReturnValue('mock-system-prompt');
    });

    // ── Test 1: Full flow — 2 courses, supervisor returns 2 actions, verify result ──

    it('full flow: 2 courses, supervisor returns 2 actions, result has session_id and actions', async () => {
        const { modelAllCourses } = await import('@/agents/modeler-pool');
        const { buildPlanContext } = await import('@/agents/context-builder');
        const { generatePlan } = await import('@/agents/supervisor');
        const { runSelfChecks } = await import('@/agents/rule-validator');

        (modelAllCourses as jest.Mock).mockResolvedValue({
            1: DEFAULT_RISK_LOW,
            2: DEFAULT_RISK_LOW,
        });
        (buildPlanContext as jest.Mock).mockReturnValue(MOCK_CONTEXT);
        (generatePlan as jest.Mock).mockResolvedValue({
            actions: [
                { schedule_id: 1, action: '逃课', reason: '水课低风险' },
                { schedule_id: 2, action: '上课', reason: '专业课必须到' },
            ],
        });
        (runSelfChecks as jest.Mock).mockReturnValue(ALL_PASSED_CHECKS);

        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(result).toBeDefined();
        expect(result.session_id).toBeGreaterThan(0);
        expect(result.actions).toHaveLength(2);
        expect(result.actions[0]).toMatchObject({
            session_id: expect.any(Number),
            schedule_id: 1,
            action: '逃课',
        });
        expect(result.actions[1]).toMatchObject({
            session_id: expect.any(Number),
            schedule_id: 2,
            action: '上课',
        });
    });

    // ── Test 2: Empty courses → SessionGenerationError thrown ──

    it('empty courses throws SessionGenerationError with EMPTY_COURSES code', async () => {
        const { getAllCourseSnapshots } = await import('@/db/memory');
        (getAllCourseSnapshots as jest.Mock).mockReturnValue([]);

        const { generateSession } = await import('@/agents/orchestrator');
        const { SessionGenerationError } = await import('@/agents/session-error');

        await expect(generateSession({})).rejects.toThrow(SessionGenerationError);
        await expect(generateSession({})).rejects.toThrow('No courses available');

        // Also verify the error details
        try {
            await generateSession({});
        } catch (e) {
            expect(e).toBeInstanceOf(SessionGenerationError);
            expect((e as any).details.code).toBe('EMPTY_COURSES');
        }
    });

    // ── Test 3: Modeler failure isolation — course 2 gets default risk, both courses have results ──

    it('modeler failure on course 2: both courses get risk results, buildPlanContext receives both', async () => {
        const { modelAllCourses } = await import('@/agents/modeler-pool');
        const { buildPlanContext } = await import('@/agents/context-builder');
        const { generatePlan } = await import('@/agents/supervisor');
        const { runSelfChecks } = await import('@/agents/rule-validator');

        (modelAllCourses as jest.Mock).mockResolvedValue({
            1: DEFAULT_RISK_LOW,
            2: DEFAULT_RISK,
        });
        (buildPlanContext as jest.Mock).mockReturnValue(MOCK_CONTEXT);
        (generatePlan as jest.Mock).mockResolvedValue({
            actions: [
                { schedule_id: 1, action: '逃课', reason: 'ok' },
                { schedule_id: 2, action: '上课', reason: 'default risk' },
            ],
        });
        (runSelfChecks as jest.Mock).mockReturnValue(ALL_PASSED_CHECKS);

        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(buildPlanContext).toHaveBeenCalledTimes(1);
        const riskResultsArg = (buildPlanContext as jest.Mock).mock.calls[0][3];
        expect(riskResultsArg).toEqual({
            1: DEFAULT_RISK_LOW,
            2: DEFAULT_RISK,
        });
        expect(Object.keys(riskResultsArg)).toHaveLength(2);

        expect(result.session_id).toBeGreaterThan(0);
        expect(result.actions).toHaveLength(2);
    });

    // ── Test 4: Retry exhaustion — supervisor always returns failing self-checks ──

    it('retry exhaustion: supervisor always returns actions that fail self-checks, error thrown', async () => {
        const { modelAllCourses } = await import('@/agents/modeler-pool');
        const { buildPlanContext } = await import('@/agents/context-builder');
        const { generatePlan } = await import('@/agents/supervisor');
        const { runSelfChecks } = await import('@/agents/rule-validator');
        const { formatViolationsHint } = await import('@/agents/rule-validator');

        (modelAllCourses as jest.Mock).mockResolvedValue({
            1: DEFAULT_RISK_LOW,
            2: DEFAULT_RISK_LOW,
        });
        (buildPlanContext as jest.Mock).mockReturnValue(MOCK_CONTEXT);
        (generatePlan as jest.Mock).mockResolvedValue({
            actions: [
                { schedule_id: 1, action: '逃课', reason: 'too many skips' },
                { schedule_id: 2, action: '逃课', reason: 'too many skips' },
            ],
        });
        (runSelfChecks as jest.Mock).mockReturnValue(ONE_FAILED_CHECK);
        (formatViolationsHint as jest.Mock).mockReturnValue('Mock retry hint: violations detected');

        const { generateSession } = await import('@/agents/orchestrator');

        await expect(generateSession({})).rejects.toThrow('方案生成失败：3 次尝试后自检仍未通过');

        expect(generatePlan).toHaveBeenCalledTimes(3);
        expect(runSelfChecks).toHaveBeenCalledTimes(3);
        expect(formatViolationsHint).toHaveBeenCalledTimes(3);
    });

    // ── Test 5: must_attend_ids constraint is passed through to context builder ──

    it('must_attend_ids constraint is passed through to context builder', async () => {
        const { modelAllCourses } = await import('@/agents/modeler-pool');
        const { buildPlanContext } = await import('@/agents/context-builder');
        const { generatePlan } = await import('@/agents/supervisor');
        const { runSelfChecks } = await import('@/agents/rule-validator');

        (modelAllCourses as jest.Mock).mockResolvedValue({
            1: DEFAULT_RISK_LOW,
            2: DEFAULT_RISK_LOW,
        });
        (buildPlanContext as jest.Mock).mockReturnValue(MOCK_CONTEXT);
        (generatePlan as jest.Mock).mockResolvedValue({
            actions: [
                { schedule_id: 1, action: '上课', reason: 'must attend' },
                { schedule_id: 2, action: '逃课', reason: 'ok' },
            ],
        });
        (runSelfChecks as jest.Mock).mockReturnValue(ALL_PASSED_CHECKS);

        const { generateSession } = await import('@/agents/orchestrator');
        await generateSession({ constraints: { must_attend_ids: [1, 3] } });

        expect(buildPlanContext).toHaveBeenCalledTimes(1);
        const mustAttendArg = (buildPlanContext as jest.Mock).mock.calls[0][4];
        expect(mustAttendArg).toEqual([1, 3]);
    });

    // ── Test 6: Multiple courses with default risk when all fail ──

    it('all modeler courses failing: all risk results are defaults, pipeline still succeeds', async () => {
        const { modelAllCourses } = await import('@/agents/modeler-pool');
        const { buildPlanContext } = await import('@/agents/context-builder');
        const { generatePlan } = await import('@/agents/supervisor');
        const { runSelfChecks } = await import('@/agents/rule-validator');

        (modelAllCourses as jest.Mock).mockResolvedValue({
            1: DEFAULT_RISK,
            2: DEFAULT_RISK,
        });
        (buildPlanContext as jest.Mock).mockReturnValue(MOCK_CONTEXT);
        (generatePlan as jest.Mock).mockResolvedValue({
            actions: [
                { schedule_id: 1, action: '上课', reason: 'default risk, play safe' },
                { schedule_id: 2, action: '上课', reason: 'default risk, play safe' },
            ],
        });
        (runSelfChecks as jest.Mock).mockReturnValue(ALL_PASSED_CHECKS);

        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(result.session_id).toBeGreaterThan(0);
        expect(result.actions).toHaveLength(2);
        const riskResultsArg = (buildPlanContext as jest.Mock).mock.calls[0][3];
        expect(riskResultsArg[1].risk_level).toBe('中风险');
        expect(riskResultsArg[1].risk_reason).toContain('降级默认值');
        expect(riskResultsArg[2].risk_level).toBe('中风险');
        expect(riskResultsArg[2].risk_reason).toContain('降级默认值');
    });
});
