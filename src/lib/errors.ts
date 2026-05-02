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

/**
 * Enhanced standard error response that sanitizes error messages automatically
 */
export function standardSanitizedErrorResponse(
    code: string,
    errorObj: unknown
): NextResponse<AppError> {
    const errorResult = handleError(errorObj);
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message: errorResult.message,
            },
        },
        { status: errorResult.status }
    );
}

export function handleError(e: unknown): { message: string; status: number } {
    const errorMessage = e instanceof Error ? e.message : String(e);
    
    // Log the real error server-side with timestamp
    console.error(`[${new Date().toISOString()}] Internal Server Error:`, e);
    
    // Determine if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
        // In development, return the real error message for debugging
        return {
            message: errorMessage,
            status: 500
        };
    } else {
        // In production, return a generic message to the client
        return {
            message: '内部服务器错误',
            status: 500
        };
    }
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
