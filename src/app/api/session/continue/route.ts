import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import { generateSession } from '@/agents/orchestrator';
import { validateBody, ContinueSessionSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { standardErrorResponse, standardSanitizedErrorResponse, ERR_CODES } from '@/lib/errors';
import { scanUserInput } from '@/lib/prompt-safety';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const rateLimit = checkRateLimit(ip, '/api/session/continue');
        if (!rateLimit.allowed) {
            return standardErrorResponse(
                ERR_CODES.RATE_LIMITED,
                '请求过于频繁，请稍后重试',
                undefined,
                429
            );
        }

        const validation = await validateBody(request, ContinueSessionSchema);
        if ('response' in validation) return validation.response;

        const { review_id, answers } = validation.data;

        for (const a of answers) {
            const scanResult = scanUserInput(a.answer);
            if (!scanResult.safe) {
                return standardErrorResponse(
                    ERR_CODES.PROMPT_INJECTION,
                    '输入包含不安全的指令模式: ' + (scanResult.blocked_reason || '未知'),
                    undefined, 400
                );
            }
        }

        const result = await generateSession({ review_answers: answers });

        return NextResponse.json({
            success: true,
            status: result.status,
            session_id: result.session_id,
            actions: result.actions,
        });
    } catch (e) {
        return standardSanitizedErrorResponse(
            ERR_CODES.INTERNAL_ERROR,
            e
        );
    }
}
