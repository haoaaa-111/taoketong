import { NextResponse } from 'next/server';

export interface AppError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: string;
    };
}

export function standardErrorResponse(
    code: string,
    message: string,
    details?: string,
    status: number = 500
): NextResponse<AppError> {
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                details: isDev ? details : undefined,
            },
        },
        { status }
    );
}

export const ERR_CODES = {
    LLM_UNAVAILABLE: 'LLM_UNAVAILABLE',
    RATE_LIMITED: 'RATE_LIMITED',
    INVALID_FILE: 'INVALID_FILE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DB_ERROR: 'DB_ERROR',
    PROMPT_INJECTION: 'PROMPT_INJECTION',
} as const;
