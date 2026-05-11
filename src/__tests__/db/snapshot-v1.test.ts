import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { generateCourseSnapshot } from '@/db/memory';
import { db, initDatabase } from '@/db';

describe('Snapshot v1: generateCourseSnapshot output', () => {
    let testCourseId: number;

    beforeAll(() => {
        initDatabase();
        const courseResult = db.prepare(`
            INSERT INTO course (name, course_type, study_mode)
            VALUES ('Snapshot V1 Test Course', '专业课', '上课学习')
        `).run();
        testCourseId = courseResult.lastInsertRowid as number;

        db.prepare(`
            INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot)
            VALUES (?, '[1,2,3,4,5,6,7,8]', 1, '早一')
        `).run(testCourseId);
    });

    afterAll(() => {
        db.prepare('DELETE FROM course_memory WHERE course_id = ?').run(testCourseId);
        db.prepare('DELETE FROM course_schedule WHERE course_id = ?').run(testCourseId);
        db.prepare('DELETE FROM course WHERE id = ?').run(testCourseId);
    });

    it('should output v1 structure with meta.version = 1', () => {
        const snapshotJson = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshotJson);
        expect(data.meta).toBeDefined();
        expect(data.meta.version).toBe(1);
    });

    it('should include meta.confidence_score between 0 and 1', () => {
        const snapshotJson = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshotJson);
        expect(data.meta.confidence_score).toBeGreaterThanOrEqual(0);
        expect(data.meta.confidence_score).toBeLessThanOrEqual(1);
    });

    it('should include meta.total_observations', () => {
        const snapshotJson = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshotJson);
        expect(data.meta.total_observations).toBeGreaterThanOrEqual(0);
    });

    it('should include rollcall_model with frequency_model', () => {
        const snapshotJson = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshotJson);
        expect(data.rollcall_model).toBeDefined();
        expect(data.rollcall_model.frequency_model).toBeDefined();
        expect(data.rollcall_model.frequency_model.type).toMatch(/poisson|unknown/);
    });

    it('caught_history should have total and trend, no bayesian_posterior', () => {
        const snapshotJson = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshotJson);
        expect(data.caught_history).toBeDefined();
        expect(typeof data.caught_history.total).toBe('number');
        expect(data.caught_history.trend).toBeDefined();
        expect(data.caught_history.bayesian_posterior).toBeUndefined();
    });

    it('should include risk_signals array', () => {
        const snapshotJson = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshotJson);
        expect(Array.isArray(data.risk_signals)).toBe(true);
    });

    it('should include memory_budget with utilization fields', () => {
        const snapshotJson = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshotJson);
        expect(data.memory_budget).toBeDefined();
        expect(data.memory_budget).toHaveProperty('used_chars');
        expect(data.memory_budget).toHaveProperty('limit_chars');
        expect(data.memory_budget).toHaveProperty('utilization_pct');
        expect(data.memory_budget.limit_chars).toBe(3000);
    });

    it('should have schedules with schedule_id', () => {
        const snapshotJson = generateCourseSnapshot(testCourseId);
        const data = JSON.parse(snapshotJson);
        for (const s of data.schedules) {
            expect(s).toHaveProperty('schedule_id');
            expect(typeof s.schedule_id).toBe('number');
        }
    });
});

describe('Snapshot v1: type contract (standalone)', () => {
    it('should contain all top-level v1 fields', () => {
        const snapshot = createTestSnapshotV1();
        const required = ['course_id', 'name', 'meta', 'schedules',
            'rollcall_model', 'caught_history', 'risk_signals', 'memory_budget'];
        for (const field of required) {
            expect(snapshot).toHaveProperty(field);
        }
    });

    it('meta should have version 1 and required sub-fields', () => {
        const snapshot = createTestSnapshotV1();
        expect(snapshot.meta.version).toBe(1);
        const metaRequired = ['version', 'updated_at', 'total_observations', 'confidence_score'];
        for (const field of metaRequired) {
            expect(snapshot.meta).toHaveProperty(field);
        }
    });

    it('confidence_score should be between 0 and 1', () => {
        const snapshot = createTestSnapshotV1();
        expect(snapshot.meta.confidence_score).toBeGreaterThanOrEqual(0);
        expect(snapshot.meta.confidence_score).toBeLessThanOrEqual(1);
    });
});

function createTestSnapshotV1() {
    return {
        course_id: 1,
        name: '高等数学',
        meta: {
            version: 1,
            updated_at: new Date().toISOString(),
            total_observations: 5,
            confidence_score: 0.7,
        },
        schedules: [{
            schedule_id: 1,
            weeks: [1, 2, 3, 4, 5, 6, 7, 8],
            day: 1,
            period: '1-2',
        }],
        rollcall_model: {
            primary_method: '随机点名',
            frequency_model: {
                type: 'poisson' as const,
                lambda: 0.3,
                confidence_interval: [0.1, 0.5] as [number, number],
            },
            pattern_detected: false,
            last_observed_week: 8,
        },
        caught_history: {
            total: 1,
            by_week: {},
            trend: 'stable' as const,
        },
        risk_signals: [
            { type: '点名频率', weeks: [3], severity: 'low' as const, confidence: 0.6 },
        ],
        memory_budget: {
            used_chars: 850,
            limit_chars: 3000,
            utilization_pct: 28.3,
        },
    };
}
