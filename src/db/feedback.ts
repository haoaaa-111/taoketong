import { db } from './index';
import type { ImmediateFeedback, WeeklyFeedback } from '@/types';

export function insertImmediateFeedback(data: Omit<ImmediateFeedback, 'id' | 'created_at'>): number {
    const result = db.prepare(
        'INSERT INTO immediate_feedback (session_id, decision, adjustment_notes) VALUES (?, ?, ?)'
    ).run(data.session_id, data.decision, data.adjustment_notes);
    return result.lastInsertRowid as number;
}

export function insertWeeklyFeedback(data: Omit<WeeklyFeedback, 'id' | 'created_at'>): number {
    const result = db.prepare(
        'INSERT INTO weekly_feedback (session_id, rating, was_caught, caught_courses, actual_events, memory_updates, comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
        data.session_id,
        data.rating,
        data.was_caught ? 1 : 0,
        data.caught_courses ? JSON.stringify(data.caught_courses) : null,
        data.actual_events ? JSON.stringify(data.actual_events) : null,
        data.memory_updates,
        data.comment
    );
    return result.lastInsertRowid as number;
}
