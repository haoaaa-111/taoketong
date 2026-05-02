import { db } from './index';
import type { PlanSession, PlanAction } from '@/types';

export function getLatestSession(): { session: PlanSession; actions: PlanAction[] } | null {
    const session = db.prepare(
        "SELECT * FROM plan_session ORDER BY created_at DESC LIMIT 1"
    ).get() as PlanSession | undefined;
    if (!session) return null;

    const actions = db.prepare(
        `SELECT pa.* FROM plan_action pa
         JOIN course_schedule cs ON pa.schedule_id = cs.id
         ORDER BY cs.day_of_week, cs.period_slot`
    ).all() as PlanAction[];

    return { session, actions };
}

export function createSession(data: { plan_start_date: string; plan_end_date: string }): number {
    const result = db.prepare(
        'INSERT INTO plan_session (plan_start_date, plan_end_date, status) VALUES (?, ?, "draft")'
    ).run(data.plan_start_date, data.plan_end_date);
    return result.lastInsertRowid as number;
}

export function rejectLatestSession(): void {
    db.prepare(
        `UPDATE plan_session SET status = 'rejected'
         WHERE id = (SELECT id FROM plan_session ORDER BY created_at DESC LIMIT 1)`
    ).run();
}

export function acceptSession(id: number): void {
    db.prepare("UPDATE plan_session SET status = 'accepted' WHERE id = ?").run(id);
}

export function insertAction(data: Omit<PlanAction, 'id'>): number {
    const result = db.prepare(
        'INSERT INTO plan_action (session_id, schedule_id, action, reason) VALUES (?, ?, ?, ?)'
    ).run(data.session_id, data.schedule_id, data.action, data.reason);
    return result.lastInsertRowid as number;
}

export function getActionsBySession(sessionId: number): PlanAction[] {
    return db.prepare(
        'SELECT * FROM plan_action WHERE session_id = ?'
    ).all(sessionId) as PlanAction[];
}
