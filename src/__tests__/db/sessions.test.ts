import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db, initDatabase } from '@/db';
import { getLatestSession } from '@/db/sessions';

function lastId(result: any): number {
    return result.lastInsertRowid;
}

describe('Bug #3: LEFT JOIN preserves session data after course deletion', () => {
    let sessionId: number;
    let schedule1: number;
    let schedule2: number;
    let courseId: number;

    beforeAll(() => {
        initDatabase();

        courseId = lastId(db.prepare(`
            INSERT INTO course (name, course_type, study_mode)
            VALUES ('Temp Bug3', '专业课', '上课学习')
        `).run());

        schedule1 = lastId(db.prepare(`
            INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot)
            VALUES (?, '[1,2,3,4]', 1, '早一')
        `).run(courseId));

        schedule2 = lastId(db.prepare(`
            INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot)
            VALUES (?, '[1,2,3,4]', 2, '午一')
        `).run(courseId));

        sessionId = lastId(db.prepare(`
            INSERT INTO plan_session (plan_start_date, plan_end_date, status)
            VALUES ('2026-01-01', '2026-01-07', 'accepted')
        `).run());

        db.prepare(`
            INSERT INTO plan_action (session_id, schedule_id, action, reason)
            VALUES (?, ?, '逃课', 'action1')
        `).run(sessionId, schedule1);

        db.prepare(`
            INSERT INTO plan_action (session_id, schedule_id, action, reason)
            VALUES (?, ?, '上课', 'action2')
        `).run(sessionId, schedule2);
    });

    afterAll(() => {
        db.prepare('DELETE FROM plan_session WHERE id = ?').run(sessionId);
        db.prepare('DELETE FROM course_schedule WHERE id IN (?, ?)').run(schedule1, schedule2);
        db.prepare('DELETE FROM course WHERE id = ?').run(courseId);
    });

    it('session should have actions when schedules exist', () => {
        const result = getLatestSession();
        expect(result).not.toBeNull();
        expect(result!.actions.length).toBeGreaterThan(0);
    });

    it('deleting one schedule preserves surviving actions with LEFT JOIN', () => {
        const initialCount = (db.prepare(
            'SELECT COUNT(*) as cnt FROM plan_action WHERE session_id = ?'
        ).get(sessionId) as any).cnt;
        expect(initialCount).toBe(2);

        db.prepare('DELETE FROM course_schedule WHERE id = ?').run(schedule1);

        const afterDelete = (db.prepare(
            'SELECT COUNT(*) as cnt FROM plan_action WHERE session_id = ?'
        ).get(sessionId) as any).cnt;
        expect(afterDelete).toBe(1);

        const leftJoinResults = db.prepare(`
            SELECT pa.*
            FROM plan_action pa
            LEFT JOIN course_schedule cs ON pa.schedule_id = cs.id
            WHERE pa.session_id = ?
        `).all(sessionId);
        expect(leftJoinResults.length).toBe(1);
        expect((leftJoinResults[0] as any).action).toBe('上课');

        const innerJoinResults = db.prepare(`
            SELECT pa.*
            FROM plan_action pa
            JOIN course_schedule cs ON pa.schedule_id = cs.id
            WHERE pa.session_id = ?
        `).all(sessionId);
        expect(innerJoinResults.length).toBe(1);
    });
});
