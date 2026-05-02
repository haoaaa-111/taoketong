import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbFeedback from '@/db/feedback';
import * as dbMemory from '@/db/memory';
import * as dbCourses from '@/db/courses';
import { generateSession } from '@/agents/orchestrator';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    const body = await request.json();

    // 如果 was_caught=true，更新被抓课程的 count
    if (body.was_caught && body.caught_courses?.length > 0) {
        for (const courseId of body.caught_courses) {
            const course = dbCourses.getCourseById(courseId);
            if (course) {
                dbCourses.updateCourse(courseId, {
                    current_caught_count: course.course.current_caught_count + 1,
                });
            }
        }
    }

    // 更新所有记忆快照
    const allSnapshots = dbMemory.getAllCourseSnapshots();
    for (const s of allSnapshots) {
        dbMemory.updateCourseMemory(s.courseId);
    }

    // 记录周后反馈
    dbFeedback.insertWeeklyFeedback({
        session_id: body.session_id,
        rating: body.rating || null,
        was_caught: body.was_caught || false,
        caught_courses: body.caught_courses || null,
        actual_events: body.actual_events || null,
        memory_updates: body.memory_updates || null,
        comment: body.comment || null,
    });

    // 自动触发下周方案
    try {
        const result = await generateSession({});
        return NextResponse.json({
            success: true,
            new_session_id: result.session_id,
            new_actions: result.actions,
        });
    } catch (e) {
        return NextResponse.json({
            success: true,
            message: '反馈已记录，方案生成失败: ' + (e as Error).message,
        });
    }
}
