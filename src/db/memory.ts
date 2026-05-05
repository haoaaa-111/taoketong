import { db } from './index';
import { safeJsonParse } from './safe-json';

export function generateCourseSnapshot(courseId: number): string {
    const course = db.prepare('SELECT * FROM course WHERE id = ?').get(courseId) as Record<string, any>;
    if (!course) throw new Error(`Course ${courseId} not found`);

    const schedules = db.prepare(
        'SELECT id, weeks, day_of_week, period_slot FROM course_schedule WHERE course_id = ?'
    ).all(courseId);

    const memories = db.prepare(
        'SELECT * FROM course_memory WHERE course_id = ? ORDER BY last_updated DESC'
    ).all(courseId);

    const observations = memories.length;
    const caughtWeeks: number[] = [];

    const snapshotData = JSON.stringify({
        course_id: course.id,
        name: course.name,
        meta: {
            version: 1,
            updated_at: new Date().toISOString(),
            total_observations: observations,
            confidence_score: observations > 0 ? Math.min(0.9, 0.3 + observations * 0.1) : 0.3,
        },
        schedules: schedules.map((s: any) => ({
            schedule_id: s.id,
            weeks: safeJsonParse(s.weeks, []),
            day: s.day_of_week,
            period: s.period_slot,
        })),
        rollcall_model: {
            primary_method: course.rollcall_methods || '未知',
            frequency_model: {
                type: 'unknown' as const,
                lambda: 0.3,
                confidence_interval: [0.1, 0.5] as [number, number],
            },
            pattern_detected: false,
            last_observed_week: 0,
        },
        caught_history: {
            total: caughtWeeks.length,
            by_week: Object.fromEntries(caughtWeeks.map((w: number) => [String(w), 1])),
            trend: 'stable' as const,
            bayesian_posterior: {
                alpha: caughtWeeks.length + 1,
                beta: Math.max(1, observations - caughtWeeks.length + 1),
                expected_probability: observations > 0
                    ? (caughtWeeks.length + 1) / (observations + 2)
                    : 0.5,
            },
        },
        risk_signals: [] as Array<Record<string, unknown>>,
        memory_budget: {
            used_chars: 0,
            limit_chars: 3000,
            utilization_pct: 0,
        },
    });

    const parsed = JSON.parse(snapshotData);
    parsed.memory_budget.used_chars = snapshotData.length;
    parsed.memory_budget.utilization_pct =
        Math.round((snapshotData.length / 3000) * 1000) / 10;

    return JSON.stringify(parsed);
}

export function getAllCourseSnapshots(): { courseId: number; snapshot: string }[] {
    const courses = db.prepare('SELECT id FROM course ORDER BY id').all() as { id: number }[];
    return courses.map(course => ({
        courseId: course.id,
        snapshot: generateCourseSnapshot(course.id),
    }));
}

export function updateCourseMemory(courseId: number): void {
    const snapshot = generateCourseSnapshot(courseId);
    const existing = db.prepare('SELECT id FROM course_memory WHERE course_id = ?').get(courseId);

    if (existing) {
        db.prepare(
            "UPDATE course_memory SET snapshot_data = ?, last_updated = datetime('now') WHERE course_id = ?"
        ).run(snapshot, courseId);
    } else {
        db.prepare(
            'INSERT INTO course_memory (course_id, snapshot_data) VALUES (?, ?)'
        ).run(courseId, snapshot);
    }
}
