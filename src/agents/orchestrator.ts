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
import crypto from 'crypto';
import { logger, setTraceId } from '@/lib/logger';
import { recordSessionMetrics } from '@/lib/metrics';
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
    const traceId = crypto.randomUUID();
    setTraceId(traceId);
    const startTime = Date.now();
    const t0 = Date.now();
    const courses = dbMemory.getAllCourseSnapshots();
    if (!courses || courses.length === 0) {
        throw new SessionGenerationError('No courses available for plan generation', {
            code: 'EMPTY_COURSES', suggestion: '请先通过课表导入添加课程',
        });
    }
    const [profile, config] = await Promise.all([
        dbProfile.ensureProfileExists(),
        dbProfile.ensureConfigExists(),
    ]);
    const t1 = Date.now();

    if ((profile.plan_weeks ?? 0) === 0) {
        logger.warn('Orchestrator', 'Generated plan with 0 plan_weeks');
    }

    const riskResults = await modelAllCourses(courses);
    const t2 = Date.now();
    const ctx = buildPlanContext(courses, profile, config, riskResults, input.constraints?.must_attend_ids);
    const plan = await generateWithRetry(ctx);
    const t3 = Date.now();

    const result = db.transaction(() => {
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

    const t4 = Date.now();
    recordSessionMetrics({
        session_id: String(result.session_id),
        trace_id: traceId,
        duration_ms: t4 - startTime,
        phases: {
            context_build_ms: t1 - t0,
            memory_prefetch_ms: 0,
            risk_modeling_ms: t2 - t1,
            plan_generation_ms: t3 - t2,
            rule_validation_ms: 0,
            persistence_ms: t4 - t3,
        },
        token_usage: { modeler_input: 0, modeler_output: 0, supervisor_input: 0, supervisor_output: 0, total: 0 },
        courses_count: courses.length,
        courses_failed: 0,
        retry_count: 0,
        self_check_passed: true,
        temperature_used: 0.8,
    });

    return result;
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
