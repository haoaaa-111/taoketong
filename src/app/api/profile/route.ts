import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbProfile from '@/db/profile';

ensureDatabaseReady();

export async function GET() {
    const profile = dbProfile.ensureProfileExists();
    return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    dbProfile.updateProfile(body);
    const profile = dbProfile.getProfile()!;

    const config = dbProfile.getConfig();
    let truncated = false;
    if (config?.semester_end_date && profile.plan_start_date) {
        const endDate = new Date(profile.plan_start_date);
        endDate.setDate(endDate.getDate() + profile.plan_weeks * 7);
        const semEnd = new Date(config.semester_end_date);
        if (endDate > semEnd) truncated = true;
    }

    return NextResponse.json({ success: true, data: profile, truncated });
}
