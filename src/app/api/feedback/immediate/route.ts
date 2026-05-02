import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbFeedback from '@/db/feedback';
import * as dbSessions from '@/db/sessions';
import * as dbMemory from '@/db/memory';
import * as dbProfile from '@/db/profile';
import { generateSession } from '@/agents/orchestrator';
import { validateBody, ImmediateFeedbackSchema } from '@/lib/validation';
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

        const validation = await validateBody(request, ImmediateFeedbackSchema);
        if ('response' in validation) return validation.response;

        const { session_id, decision, adjustment_notes } = validation.data;

        dbFeedback.insertImmediateFeedback({
            session_id,
            decision,
            adjustment_notes: adjustment_notes ?? null,
        });

        if (decision === 'rejected') {
            const allSnapshots = dbMemory.getAllCourseSnapshots();
            for (const s of allSnapshots) {
                dbMemory.updateCourseMemory(s.courseId);
            }

            const result = await generateSession({
                adjustment_notes: adjustment_notes ?? undefined,
            });

            return NextResponse.json({
                success: true,
                new_session_id: result.session_id,
                new_actions: result.actions,
            });
        }

        if (decision === 'accepted') {
            dbSessions.acceptSession(session_id);
            dbProfile.updateProfile({ has_completed_onboarding: true });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return standardErrorResponse(
            ERR_CODES.INTERNAL_ERROR,
            '反馈处理失败',
            (e as Error).message
        );
    }
}
