import { describe, it, expect, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('@/db/memory', () => ({
    getAllCourseSnapshots: jest.fn(() => [
        { course_id: 1, course_name: 'Course A', snapshot_data: '{"name":"Course A"}' },
        { course_id: 2, course_name: 'Course B', snapshot_data: '{"name":"Course B"}' },
    ]),
    updateCourseMemory: jest.fn(),
}));

jest.mock('@/db/profile', () => ({
    ensureProfileExists: jest.fn(() => ({
        id: 1, plan_weeks: 4, skip_motivation: [],
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

jest.mock('@/agents/modeler', () => ({
    modelCourseRisk: jest.fn().mockResolvedValue({
        risk_level: '低风险', risk_reason: 'Mocked',
        next_caught_probability: 0.2,
    }),
}));

jest.mock('@/agents/supervisor', () => ({
    generatePlan: jest.fn().mockResolvedValue({
        actions: [
            { schedule_id: 1, week: 1, action: '逃课', reason: 'reason1' },
            { schedule_id: 2, week: 1, action: '上课', reason: 'reason2' },
        ],
    }),
    getAdaptiveTemperature: jest.fn(() => 0.8),
}));

jest.mock('@/db/sessions', () => ({
    getLatestSession: jest.fn(() => null),
    rejectLatestSession: jest.fn(),
    createSession: jest.fn(() => 1),
    insertAction: jest.fn((data: any) => 100 + data.schedule_id),
}));

jest.mock('@/db', () => ({
    db: { transaction: jest.fn((fn: () => any) => () => fn()) },
}));

describe('Orchestrator Pipeline Parallelism', () => {
    const orchestratorSrc = readFileSync(
        join(process.cwd(), 'src/agents/orchestrator.ts'),
        'utf-8'
    );

    it('should use Promise.all for parallel profile+config fetch', () => {
        const lines = orchestratorSrc.split('\n');

        const profileLine = lines.findIndex(l =>
            l.includes('ensureProfileExists') && !l.includes('import')
        );
        const configLine = lines.findIndex(l =>
            l.includes('ensureConfigExists') && !l.includes('import')
        );
        const promiseAllLine = lines.findIndex(l =>
            l.includes('Promise.all([')
        );

        expect(profileLine).toBeGreaterThan(0);
        expect(configLine).toBeGreaterThan(0);

        const hasParallelFetch = promiseAllLine > 0
            && promiseAllLine < profileLine
            && profileLine > promiseAllLine
            && configLine > promiseAllLine
            && Math.abs(profileLine - configLine) <= 3;

        expect(hasParallelFetch).toBe(true);
    });

    it('modeler pool should use Promise.all for parallel course risk assessment', () => {
        const modelerSrc = readFileSync(
            join(process.cwd(), 'src/agents/modeler-pool.ts'),
            'utf-8'
        );
        expect(modelerSrc).toContain('Promise.all(');
    });

    it('profile and config should be destructured from single Promise.all call', () => {
        const hasDestructuredPromiseAll = orchestratorSrc.includes(
            'const [profile, config] = await Promise.all(['
        );
        expect(hasDestructuredPromiseAll).toBe(true);
    });

    it('should complete full pipeline and return valid result', async () => {
        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(result).toBeDefined();
        expect(result.session_id).toBe(1);
        expect(result.actions).toHaveLength(2);
        expect(result.actions[0]).toHaveProperty('schedule_id');
        expect(result.actions[0]).toHaveProperty('action');
        expect(result.actions[0]).toHaveProperty('reason');
    });

    it('should not crash when profile.plan_weeks is 0 (Bug-7)', async () => {
        const { ensureProfileExists } = await import('@/db/profile');
        (ensureProfileExists as jest.Mock).mockReturnValue({
            id: 1, plan_weeks: 0, skip_motivation: [],
            plan_start_date: null, weekly_skip_habit: 0,
            weekly_skip_target: 3, sub_cost_max: 30,
            escape_rush_accept: true, commute_cost_minutes: 10,
            has_completed_onboarding: true,
            created_at: '', updated_at: '',
        });

        const { generateSession } = await import('@/agents/orchestrator');
        const result = await generateSession({});

        expect(result).toBeDefined();
        expect(result.session_id).toBe(1);
    });

});
