import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbFeedback from '@/db/feedback';
import * as dbSessions from '@/db/sessions';
import * as dbMemory from '@/db/memory';
import * as dbProfile from '@/db/profile';
import { generateSession } from '@/agents/orchestrator';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    const body = await request.json();

    dbFeedback.insertImmediateFeedback({
        session_id: body.session_id,
        decision: body.decision,
        adjustment_notes: body.adjustment_notes || null,
    });

    if (body.decision === 'rejected') {
        // 更新快照 + 重新生成
        const allSnapshots = dbMemory.getAllCourseSnapshots();
        for (const s of allSnapshots) {
            dbMemory.updateCourseMemory(s.courseId);
        }

        const result = await generateSession({
            adjustment_notes: body.adjustment_notes,
        });

        return NextResponse.json({
            success: true,
            new_session_id: result.session_id,
            new_actions: result.actions,
        });
    }

    if (body.decision === 'accepted') {
        dbSessions.acceptSession(body.session_id);
        dbProfile.updateProfile({ has_completed_onboarding: true });
    }

    return NextResponse.json({ success: true });
}
