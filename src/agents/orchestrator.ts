import * as dbMemory from '@/db/memory';
import * as dbSessions from '@/db/sessions';
import * as dbProfile from '@/db/profile';
import { generatePlan, getAdaptiveTemperature } from './supervisor';
import { db } from '@/db';
import { buildSupervisorSystemPrompt } from './prompt-builder';
import { runSelfChecks, formatViolationsHint } from './rule-validator';
import { buildPlanContext } from './context-builder';
import { modelAllCourses } from './modeler-pool';
import { addDays, formatISO } from 'date-fns';
import { SessionGenerationError } from './session-error';
import type { PlanAction, StructuredPlanContext } from '@/types';

export interface SessionInput {
    adjustment_notes?: string;
    constraints?: { skip_course_ids?: number[]; must_attend_ids?: number[] };
}

const MAX_RETRIES = 3;
const TEMP_STEP = 0.2;

export async function generateSession(input: SessionInput): Promise<{
    session_id: number; actions: PlanAction[];
}> {
    const courses = dbMemory.getAllCourseSnapshots();
    if (!courses || courses.length === 0) {
        throw new SessionGenerationError('No courses available for plan generation', {
            code: 'EMPTY_COURSES', suggestion: '请先通过课表导入添加课程',
        });
    }
    const profile = dbProfile.ensureProfileExists();
    const config = dbProfile.ensureConfigExists();

    if ((profile.plan_weeks ?? 0) === 0) {
        console.warn('[Orchestrator] Generated plan with 0 plan_weeks');
    }

    const riskResults = await modelAllCourses(courses);
    const ctx = buildPlanContext(courses, profile, config, riskResults, input.constraints?.must_attend_ids);
    const plan = await generateWithRetry(ctx);

    return db.transaction(() => {
        const latest = dbSessions.getLatestSession();
        if (latest?.session.status === 'draft') dbSessions.rejectLatestSession();

        const sessionId = dbSessions.createSession({
            plan_start_date: formatISO(new Date(), { representation: 'date' }),
            plan_end_date: formatISO(addDays(new Date(), (profile.plan_weeks || 1) * 7),
                { representation: 'date' }),
        });

        const actions: PlanAction[] = plan.actions.map(a => {
            const id = dbSessions.insertAction({
                session_id: sessionId, schedule_id: a.schedule_id,
                action: a.action as PlanAction['action'], reason: a.reason,
            });
            return { id, session_id: sessionId, schedule_id: a.schedule_id,
                action: a.action as PlanAction['action'], reason: a.reason };
        });

        for (const c of courses) dbMemory.updateCourseMemory(c.courseId);
        return { session_id: sessionId, actions };
    })();
}

async function generateWithRetry(ctx: StructuredPlanContext): Promise<{
    actions: Array<{ schedule_id: number; action: string; reason: string }>;
}> {
    let temp = getAdaptiveTemperature(ctx);
    for (let i = 0; i < MAX_RETRIES; i++) {
        const result = await generatePlan(buildSupervisorSystemPrompt(ctx), temp);
        const checks = runSelfChecks(result.actions, ctx);
        if (checks.every(c => c.passed)) return result;
        ctx.retry_hint = formatViolationsHint(checks);
        temp = Math.max(0.3, temp - TEMP_STEP);
        ctx.temperature_modifier = temp;
    }
    throw new Error('方案生成失败：3 次尝试后自检仍未通过');
}
