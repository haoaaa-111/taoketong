import { db } from './index';
import type { Course, CourseSchedule, CourseWithSchedules } from '@/types';

export function getAllCoursesWithSchedules(): CourseWithSchedules[] {
    const courses = db.prepare('SELECT * FROM course').all() as Course[];
    return courses.map(course => ({
        course,
        schedules: db.prepare('SELECT * FROM course_schedule WHERE course_id = ?')
            .all(course.id) as CourseSchedule[],
    }));
}

export function getCourseById(id: number): CourseWithSchedules | null {
    const course = db.prepare('SELECT * FROM course WHERE id = ?').get(id) as Course | undefined;
    if (!course) return null;
    return {
        course,
        schedules: db.prepare('SELECT * FROM course_schedule WHERE course_id = ?')
            .all(id) as CourseSchedule[],
    };
}

export function updateCourse(id: number, data: Partial<Course>): void {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    const columns = entries.map(([k]) => k);
    const values = entries.map(([_, v]) => v);
    if (columns.length === 0) return;

    // JSON 字段需要序列化
    const jsonFields = ['rollcall_methods', 'rollcall_history', 'exam_weeks'];
    const finalValues = values.map((v, i) => {
        if (jsonFields.includes(columns[i]) && typeof v !== 'string') {
            return JSON.stringify(v);
        }
        return v;
    });

    db.prepare(
        `UPDATE course SET ${columns.map(c => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...finalValues, id);
}

export function deleteCourse(id: number): void {
    db.prepare('DELETE FROM course WHERE id = ?').run(id);
}

export function insertCourse(data: Omit<Course, 'id' | 'created_at' | 'updated_at'>): number {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?');
    const values = Object.values(data);

    const jsonFields = ['rollcall_methods', 'rollcall_history', 'exam_weeks'];
    const finalValues = values.map((v, i) => {
        if (jsonFields.includes(keys[i]) && typeof v !== 'string') {
            return JSON.stringify(v);
        }
        return v;
    });

    const result = db.prepare(
        `INSERT INTO course (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`
    ).run(...finalValues);

    return result.lastInsertRowid as number;
}

export function insertSchedule(data: Omit<CourseSchedule, 'id'>): number {
    const result = db.prepare(
        'INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot) VALUES (?, ?, ?, ?)'
    ).run(
        data.course_id,
        JSON.stringify(data.weeks),
        data.day_of_week,
        data.period_slot
    );
    return result.lastInsertRowid as number;
}
