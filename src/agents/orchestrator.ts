import * as dbMemory from '@/db/memory';
import * as dbSessions from '@/db/sessions';
import * as dbProfile from '@/db/profile';
import { modelCourseRisk } from './modeler';
import { generatePlan } from './supervisor';
import { db } from '@/db';
import type { PlanAction } from '@/types';
import { addDays, formatISO } from 'date-fns';
import { wrapUserInput, sanitizeForPrompt } from '@/lib/prompt-safety';

export interface SessionInput {
    adjustment_notes?: string;
    constraints?: {
        skip_course_ids?: number[];
        must_attend_ids?: number[];
    };
}

export async function generateSession(
    input: SessionInput
): Promise<{ session_id: number; actions: PlanAction[] }> {
    // 1. 获取所有课程快照（仅读取，不写入）
    const courses = dbMemory.getAllCourseSnapshots();

    // 2. 获取用户画像
    const profile = dbProfile.ensureProfileExists();
    const config = dbProfile.ensureConfigExists();

    // 3. 对每门课程进行风险建模（并行 + 失败隔离）
    const DEFAULT_RISK = {
        risk_level: '中风险' as const,
        risk_reason: '无法获取风险评估（降级默认值）',
        next_caught_probability: 0.3,
    };

    const riskResults: Record<number, { risk_level: string; risk_reason: string; next_caught_probability: number }> = {};
    const riskPromises = courses.map(async (c) => {
        let risk: { risk_level: string; risk_reason: string; next_caught_probability: number };
        try {
            risk = await modelCourseRisk(c.snapshot);
        } catch (e) {
            console.warn(
                `[Orchestrator] Modeler failed for course ${c.courseId}, using default risk`,
                e instanceof Error ? e.message : String(e)
            );
            risk = DEFAULT_RISK;
        }
        return { courseId: c.courseId, risk };
    });

    const riskArray = await Promise.all(riskPromises);
    for (const r of riskArray) {
        riskResults[r.courseId] = r.risk;
    }

    // 4. 拼接 Supervisor 的 prompt 上下文
    const currentWeek = config.current_week ?? 1;
    const dayOfWeek = config.current_day_of_week ?? 1;
    const semesterStart = config.semester_start_date ?? '未设置';
    const semesterEnd = config.semester_end_date ?? '未设置';
    let prompt = `[用户画像]\n${JSON.stringify(profile, null, 2)}\n\n`;
    prompt += `[学期信息]\n当前第${currentWeek}周，周${dayOfWeek}\n`;
    prompt += `学期：${semesterStart} 至 ${semesterEnd}\n\n`;

    for (const c of courses) {
        prompt += `[课程记忆快照 - ${JSON.parse(c.snapshot).name}]\n`;
        prompt += `${c.snapshot}\n\n`;
        if (riskResults[c.courseId]) {
            prompt += `风险评估：${JSON.stringify(riskResults[c.courseId])}\n\n`;
        }
    }

    if (input.adjustment_notes) {
        prompt += `[调整建议]\n${wrapUserInput(input.adjustment_notes)}\n\n`;
    }
    if (input.constraints) {
        prompt += `[约束]\n${sanitizeForPrompt(JSON.stringify(input.constraints))}\n\n`;
    }

    prompt += '[生成指令]\n以上课程信息，请生成方案。';

    // 5. Supervisor 生成方案（最多重试 2 次）
    let result: { actions: { schedule_id: number; action: string; reason: string }[] } | undefined;
    let retries = 0;
    while (retries <= 2) {
        try {
            result = await generatePlan(prompt);
            if (result.actions && result.actions.length > 0) break;
        } catch (e) {
            // retry
        }
        retries++;
    }

    if (!result || !result.actions || result.actions.length === 0) {
        throw new Error('方案生成失败');
    }

    // 原子 DB 操作：这些操作需要原子性，确保要么全部成功要么全部失败
    const transaction = db.transaction(() => {
        // 拒绝最新会话（如果存在且为草稿状态）
        const latest = dbSessions.getLatestSession();
        if (latest && latest.session.status === 'draft') {
            dbSessions.rejectLatestSession();
        }

        // 创建新会话
        const startDate = new Date();
        const endDate = addDays(startDate, (profile.plan_weeks || 1) * 7);

        const sessionId = dbSessions.createSession({
            plan_start_date: formatISO(startDate, { representation: 'date' }),
            plan_end_date: formatISO(endDate, { representation: 'date' }),
        });

        // 保存动作
        const actions: PlanAction[] = result!.actions.map(a => {
            const id = dbSessions.insertAction({
                session_id: sessionId,
                schedule_id: a.schedule_id,
                action: a.action as PlanAction['action'],
                reason: a.reason,
            });
            return { id, session_id: sessionId, schedule_id: a.schedule_id, action: a.action as PlanAction['action'], reason: a.reason };
        });

        // 更新课程记忆（原子操作：保证 memory 与 session 数据一致性）
        const courseIds = courses.map(c => c.courseId);
        for (const c of courseIds) {
            dbMemory.updateCourseMemory(c);
        }

        return { session_id: sessionId, actions };
    });

    return transaction();
}
