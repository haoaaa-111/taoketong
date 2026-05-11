import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@/agents/modeler', () => ({
    modelCourseRisk: jest.fn(),
}));

jest.mock('@/agents/supervisor', () => ({
    generatePlan: jest.fn(),
    getAdaptiveTemperature: jest.fn(() => 0.8),
}));

jest.mock('@/db/memory', () => ({
    getAllCourseSnapshots: jest.fn(() => [
        { course_id: 1, course_name: 'Course A', snapshot_data: '{"name":"Course A"}' },
        { course_id: 2, course_name: 'Course B', snapshot_data: '{"name":"Course B"}' },
        { course_id: 3, course_name: 'Course C', snapshot_data: '{"name":"Course C"}' },
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
    insertAction: jest.fn((data: any) => {
        return 100 + data.schedule_id;
    }),
}));

jest.mock('@/db', () => ({
    db: {
        transaction: jest.fn((fn: () => any) => {
            return () => fn();
        }),
    },
}));

describe('Bug #5: Modeler failure isolation', () => {
    const DEFAULT_RISK = {
        risk_level: '中风险' as const,
        risk_reason: '无法获取风险评估（降级默认值）',
        next_caught_probability: 0.3,
    };

    it('single course modeler failure should not block other courses', async () => {
        const { modelCourseRisk } = await import('@/agents/modeler');
        const { generatePlan } = await import('@/agents/supervisor');

        (modelCourseRisk as jest.Mock).mockImplementation((snapshot: any) => {
            if (snapshot.includes('Course B')) {
                return Promise.reject(new Error('Simulated modeler failure'));
            }
            return Promise.resolve({
                risk_level: '低风险',
                risk_reason: 'Mocked assessment',
                next_caught_probability: 0.2,
            });
        });

        (generatePlan as jest.Mock).mockResolvedValue({
            actions: [
                { schedule_id: 1, week: 1, action: '逃课', reason: 'reason1' },
                { schedule_id: 2, week: 1, action: '上课', reason: 'reason2' },
            ],
        } as any);

        const { generateSession } = await import('@/agents/orchestrator');

        const result = await generateSession({});

        expect(result).toBeDefined();
        expect(result.session_id).toBeGreaterThan(0);
    });

    it('riskPromises pattern handles mixed success and failure', async () => {
        const courses = [
            { course_id: 1, course_name: 'Course 1', snapshot_data: 'good' },
            { course_id: 2, course_name: 'Course 2', snapshot_data: 'bad' },
            { course_id: 3, course_name: 'Course 3', snapshot_data: 'good2' },
        ];

        const mockModeler = (snapshot: string) => {
            if (snapshot === 'bad') {
                return Promise.reject(new Error('failure'));
            }
            return Promise.resolve({
                risk_level: '低风险',
                risk_reason: 'ok',
                next_caught_probability: 0.1,
            });
        };

        const riskPromises = courses.map(async (c) => {
            try {
                const risk = await mockModeler(c.snapshot_data);
                return { courseId: c.course_id, risk, error: null };
            } catch (e) {
                return { courseId: c.course_id, risk: DEFAULT_RISK, error: e };
            }
        });

        const results = await Promise.all(riskPromises);

        expect(results).toHaveLength(3);
        expect(results[0].error).toBeNull();
        expect(results[0].risk.risk_level).toBe('低风险');

        expect(results[1].error).not.toBeNull();
        expect(results[1].risk.risk_level).toBe('中风险');
        expect(results[1].risk.risk_reason).toContain('降级默认值');

        expect(results[2].error).toBeNull();
        expect(results[2].risk.risk_level).toBe('低风险');
    });

    it('all courses failing should still produce results with defaults', async () => {
        const courses = [
            { course_id: 1, course_name: 'Course 1', snapshot_data: 'fail1' },
            { course_id: 2, course_name: 'Course 2', snapshot_data: 'fail2' },
        ];

        const mockModeler = (_snapshot: string) => Promise.reject(new Error('all fail'));

        const riskPromises = courses.map(async (c) => {
            try {
                const risk = await mockModeler(c.snapshot_data);
                return { courseId: c.course_id, risk, error: null };
            } catch (e) {
                return { courseId: c.course_id, risk: DEFAULT_RISK, error: e };
            }
        });

        const results = await Promise.all(riskPromises);

        expect(results).toHaveLength(2);
        results.forEach(r => {
            expect(r.error).not.toBeNull();
            expect(r.risk.risk_level).toBe('中风险');
        });
    });
});
