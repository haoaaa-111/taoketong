import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbFeedback from '@/db/feedback';
import * as dbMemory from '@/db/memory';
import * as dbCourses from '@/db/courses';
import { generateSession } from '@/agents/orchestrator';
import { validateBody, WeeklyFeedbackSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { standardErrorResponse, standardSanitizedErrorResponse, ERR_CODES, handleError } from '@/lib/errors';
import { db } from '@/db';
import { parseUserInput } from '@/agents/memory';
import { scanUserInput } from '@/lib/prompt-safety';

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

        const userText = data.comment || data.memory_updates || '';
        if (userText) {
            const scanResult = scanUserInput(userText);
            if (!scanResult.safe) {
                return standardErrorResponse(
                    ERR_CODES.PROMPT_INJECTION,
                    '输入包含不安全的指令模式: ' + (scanResult.blocked_reason || '未知'),
                    undefined, 400
                );
            }
        }

        // Wrap all DB operations in transaction to maintain consistency
        const transaction = db.transaction(() => {
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
                dbMemory.updateCourseMemory(s.course_id);
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
        });

        transaction();

        try {
            const parseResult = await parseUserInput(
                data.memory_updates ?? data.comment ?? ''
            );
            if (parseResult.updates.length > 0) {
                console.log('[Memory] Parsed', parseResult.updates.length, 'updates from weekly feedback');
                if (parseResult.detected_patterns?.length) {
                    console.log('[Memory] Detected patterns:', parseResult.detected_patterns);
                }
            }
        } catch (e) {
            console.warn('[Memory] Failed to parse weekly feedback:', e instanceof Error ? e.message : String(e));
        }

        try {
            const result = await generateSession({});
            return NextResponse.json({
                success: true,
                new_session_id: result.session_id,
                new_actions: result.actions,
            });
        } catch (e) {
            const errorResult = handleError(e);
            return NextResponse.json({
                success: true,
                message: '反馈已记录，方案生成失败: ' + errorResult.message,
            });
        }
    } catch (e) {
        return standardSanitizedErrorResponse(
            ERR_CODES.INTERNAL_ERROR,
            e
        );
    }
}
