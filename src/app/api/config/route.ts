import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbProfile from '@/db/profile';

ensureDatabaseReady();

export async function GET() {
    const config = dbProfile.ensureConfigExists();
    return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    dbProfile.updateConfig(body);
    return NextResponse.json({ success: true });
}
