import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbProfile from '@/db/profile';
import { validateBody, ConfigUpdateSchema } from '@/lib/validation';

ensureDatabaseReady();

export async function GET() {
    const config = dbProfile.ensureConfigExists();
    return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
    try {
        const validation = await validateBody(request, ConfigUpdateSchema);
        if ('response' in validation) return validation.response;

        dbProfile.updateConfig(validation.data);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false, message: (e as Error).message }, { status: 500 });
    }
}
