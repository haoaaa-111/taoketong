import { db } from './index';
import { safeJsonParse } from './safe-json';

export function generateCourseSnapshot(courseId: number): string {
    const course = db.prepare('SELECT * FROM course WHERE id = ?').get(courseId) as Record<string, any>;
    if (!course) throw new Error(`Course ${courseId} not found`);

    const schedules = db.prepare(
        'SELECT id, weeks, day_of_week, period_slot FROM course_schedule WHERE course_id = ?'
    ).all(courseId);

    const snapshot = {
        course_id: course.id,
        name: course.name,
        teacher_name: course.teacher_name,
        location: course.location,
        course_type: course.course_type,
        study_mode: course.study_mode,
        teacher_attitude: course.teacher_attitude,
        escape_difficulty: course.escape_difficulty,
        rollcall_methods: safeJsonParse(course.rollcall_methods || '[]', []),
        catch_tolerance: course.catch_tolerance_per_class,
        max_catch_limit: course.max_catch_limit,
        current_caught_count: course.current_caught_count,
        rollcall_history: safeJsonParse(course.rollcall_history || '[]', []),
        exam_weeks: course.exam_weeks ? safeJsonParse<Record<string, unknown>>(course.exam_weeks, {}) : null,
        notes: course.notes,
        schedules: schedules.map((s: any) => ({
            schedule_id: s.id,
            weeks: safeJsonParse(s.weeks, []),
            day: s.day_of_week,
            period: s.period_slot,
        })),
    };
    return JSON.stringify(snapshot);
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
