import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbSessions from '@/db/sessions';

ensureDatabaseReady();

export async function GET() {
    const latest = dbSessions.getLatestSession();
    if (!latest) return NextResponse.json({ error: 'No sessions' }, { status: 404 });
    return NextResponse.json({ session: latest.session, actions: latest.actions });
}
