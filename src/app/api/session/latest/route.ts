import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbSessions from '@/db/sessions';
import { handleError } from '@/lib/errors';

ensureDatabaseReady();

export async function GET() {
    try {
        const latest = dbSessions.getLatestSession();
        if (!latest) return NextResponse.json({ error: 'No sessions' }, { status: 404 });
        return NextResponse.json({ session: latest.session, actions: latest.actions });
    } catch (e) {
        const errorResult = handleError(e);
        return NextResponse.json({ success: false, message: errorResult.message }, { status: errorResult.status });
    }
}
