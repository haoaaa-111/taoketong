import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import { generateSession } from '@/agents/orchestrator';
import { validateBody, SessionSchema } from '@/lib/validation';
import { checkRateLimit, getConfig } from '@/lib/rate-limit';
import { standardErrorResponse, ERR_CODES } from '@/lib/errors';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const rateLimit = checkRateLimit(ip, '/api/session');
        if (!rateLimit.allowed) {
            return standardErrorResponse(
                ERR_CODES.RATE_LIMITED,
                '请求过于频繁，请稍后重试',
                undefined,
                429
            );
        }

        const validation = await validateBody(request, SessionSchema);
        if ('response' in validation) return validation.response;

        const result = await generateSession(validation.data);
        return NextResponse.json({
            success: true,
            session_id: result.session_id,
            actions: result.actions,
        });
    } catch (e) {
        return standardErrorResponse(
            ERR_CODES.INTERNAL_ERROR,
            '方案生成失败',
            (e as Error).message
        );
    }
}
