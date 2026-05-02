import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import { generateSession } from '@/agents/orchestrator';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await generateSession({
            adjustment_notes: body.adjustment_notes,
            constraints: body.constraints,
        });
        return NextResponse.json({
            success: true,
            session_id: result.session_id,
            actions: result.actions,
        });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: (e as Error).message },
            { status: 500 }
        );
    }
}
