import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbFeedback from '@/db/feedback';
import * as dbMemory from '@/db/memory';
import * as dbCourses from '@/db/courses';
import { generateSession } from '@/agents/orchestrator';
import { validateBody, WeeklyFeedbackSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { standardErrorResponse, ERR_CODES } from '@/lib/errors';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const rateLimit = checkRateLimit(ip, '/api/feedback');
        if (!rateLimit.allowed) {
            return standardErrorResponse(ERR_CODES.RATE_LIMITED, '请求过于频繁，请稍后重试', undefined, 429);
        }

        const validation = await validateBody(request, WeeklyFeedbackSchema);
        if ('response' in validation) return validation.response;

        const data = validation.data;

        if (data.was_caught && data.caught_courses?.length) {
            for (const courseId of data.caught_courses) {
                const course = dbCourses.getCourseById(courseId);
                if (course) {
                    dbCourses.updateCourse(courseId, {
                        current_caught_count: course.course.current_caught_count + 1,
                    });
                }
            }
        }

        const allSnapshots = dbMemory.getAllCourseSnapshots();
        for (const s of allSnapshots) {
            dbMemory.updateCourseMemory(s.courseId);
        }

        dbFeedback.insertWeeklyFeedback({
            session_id: data.session_id,
            rating: data.rating ?? null,
            was_caught: data.was_caught ?? false,
            caught_courses: data.caught_courses ?? null,
            actual_events: data.actual_events ?? null,
            memory_updates: data.memory_updates ?? null,
            comment: data.comment ?? null,
        });

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
    } catch (e) {
        return standardErrorResponse(
            ERR_CODES.INTERNAL_ERROR,
            '周反馈处理失败',
            (e as Error).message
        );
    }
}
