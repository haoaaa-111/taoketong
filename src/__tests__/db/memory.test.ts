import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { generateCourseSnapshot, getAllCourseSnapshots } from '@/db/memory';
import { db, initDatabase } from '@/db';

describe('Bug #1: schedule_id in course snapshots', () => {
    let testCourseId: number;

    beforeAll(() => {
        initDatabase();
        const courseResult = db.prepare(`
            INSERT INTO course (name, course_type, study_mode)
            VALUES ('Test Course for Bug #1', '水课', '自学')
        `).run();
        testCourseId = courseResult.lastInsertRowid as number;

        db.prepare(`
            INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot)
            VALUES (?, '[1,2,3,4]', 1, '早一')
        `).run(testCourseId);

        const snapshot = generateCourseSnapshot(testCourseId);
        db.prepare(`
            INSERT INTO course_memory (course_id, snapshot_data)
            VALUES (?, ?)
        `).run(testCourseId, snapshot);
    });

    afterAll(() => {
        // Clean up test data in reverse dependency order
        db.prepare('DELETE FROM course_memory WHERE course_id = ?').run(testCourseId);
        db.prepare('DELETE FROM course_schedule WHERE course_id = ?').run(testCourseId);
        db.prepare('DELETE FROM course WHERE id = ?').run(testCourseId);
    });

    it('snapshot schedules should contain schedule_id field', () => {
        const snapshot = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshot);

        expect(data).toHaveProperty('schedules');
        expect(Array.isArray(data.schedules)).toBe(true);
        expect(data.schedules.length).toBeGreaterThan(0);

        for (const schedule of data.schedules) {
            expect(schedule).toHaveProperty('schedule_id');
            expect(typeof schedule.schedule_id).toBe('number');
            expect(schedule.schedule_id).toBeGreaterThan(0);
        }
    });

    it('schedule_id should match the original course_schedule record', () => {
        const snapshot = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshot);

        for (const s of data.schedules) {
            const record = db.prepare(
                'SELECT id FROM course_schedule WHERE id = ?'
            ).get(s.schedule_id);
            expect(record).toBeDefined();
        }
    });

    it('getAllCourseSnapshots should include schedule_id in all snapshots', () => {
        const snapshots = getAllCourseSnapshots();

        // Find our test course in the results
        const testSnapshot = snapshots.find(s => s.course_id === testCourseId);
        expect(testSnapshot).toBeDefined();

        if (testSnapshot) {
            const data = JSON.parse(testSnapshot.snapshot_data);
            expect(data.schedules.length).toBeGreaterThan(0);
            for (const schedule of data.schedules) {
                expect(schedule).toHaveProperty('schedule_id');
                expect(schedule.schedule_id).toBeGreaterThan(0);
            }
        }
    });
});

describe('Bug: Bayesian data pipeline — caught_history accuracy', () => {
    let courseId: number;

    beforeAll(() => {
        initDatabase();
        const result = db.prepare(`
            INSERT INTO course (name, course_type, study_mode, current_caught_count)
            VALUES ('CaughtCourse', '专业课', '上课学习', 5)
        `).run();
        courseId = result.lastInsertRowid as number;

        db.prepare(`
            INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot)
            VALUES (?, '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]', 1, '早一')
        `).run(courseId);
    });

    afterAll(() => {
        db.prepare('DELETE FROM course_memory WHERE course_id = ?').run(courseId);
        db.prepare('DELETE FROM course_schedule WHERE course_id = ?').run(courseId);
        db.prepare('DELETE FROM course WHERE id = ?').run(courseId);
    });

    it('caught_history.total should equal course.current_caught_count', () => {
        const snapshot = generateCourseSnapshot(courseId);
        const data = JSON.parse(snapshot);

        expect(data.caught_history).toBeDefined();
        expect(data.caught_history.total).toBe(5);
    });

    it('caught_history should NOT contain bayesian_posterior', () => {
        const snapshot = generateCourseSnapshot(courseId);
        const data = JSON.parse(snapshot);

        expect(data.caught_history.bayesian_posterior).toBeUndefined();
    });

    it('caught_history should still contain trend field', () => {
        const snapshot = generateCourseSnapshot(courseId);
        const data = JSON.parse(snapshot);

        expect(data.caught_history.trend).toBeDefined();
    });
});
