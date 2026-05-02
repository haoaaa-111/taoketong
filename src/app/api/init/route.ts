import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbSessions from '@/db/sessions';
import { handleError } from '@/lib/errors';

ensureDatabaseReady();

export async function GET() {
    try {
        const latest = dbSessions.getLatestSession();
        if (latest && (latest.session.status === 'draft' || latest.session.status === 'accepted')) {
            return NextResponse.json({
                has_data: true,
                last_session: latest.session,
                last_actions: latest.actions,
            });
        }
        return NextResponse.json({ has_data: false });
    } catch (e) {
        const errorResult = handleError(e);
        return NextResponse.json({ success: false, message: errorResult.message }, { status: errorResult.status });
    }
}
