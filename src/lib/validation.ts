import { z } from 'zod';
import { NextResponse } from 'next/server';

export { z };

export interface ValidationError {
    success: false;
    error: {
        code: 'VALIDATION_ERROR';
        message: string;
        details: Array<{ field: string; message: string }>;
    };
}

export function validationErrorResponse(error: z.ZodError<unknown>): NextResponse<ValidationError> {
    return NextResponse.json(
        {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: '请求参数校验失败',
                details: error.issues.map(e => ({
                    field: (e.path as (string | number)[]).join('.') || 'body',
                    message: e.message,
                })),
            },
        },
        { status: 400 }
    );
}

export async function validateBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ data: T } | { response: NextResponse<ValidationError> }> {
    try {
        const body = await request.json();
        const data = schema.parse(body);
        return { data };
    } catch (e) {
        if (e instanceof z.ZodError) {
            return { response: validationErrorResponse(e) };
        }
        throw e;
    }
}

// === all API schemas ===

export const SessionSchema = z.object({
    adjustment_notes: z.string().optional(),
    constraints: z
        .object({
            skip_course_ids: z.array(z.number()),
            must_attend_ids: z.array(z.number()),
        })
        .passthrough()
        .optional(),
});

export const ImmediateFeedbackSchema = z.object({
    session_id: z.number(),
    decision: z.enum(['accepted', 'rejected']),
    adjustment_notes: z.string().nullable().optional(),
});

export const WeeklyFeedbackSchema = z.object({
    session_id: z.number(),
    rating: z.number().nullable().optional(),
    was_caught: z.boolean().optional(),
    caught_courses: z.array(z.number()).nullable().optional(),
    actual_events: z.array(z.object({
        course_id: z.number(),
        event_type: z.enum(['点名预警', '交作业', '调课', '补课', '其他']),
        event_text: z.string(),
        event_date: z.string(),
    })).nullable().optional(),
    memory_updates: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
});

export const CourseInsertSchema = z.object({
    name: z.string().min(1, '课程名称不能为空'),
    location: z.string().nullable().optional(),
    teacher_name: z.string().nullable().optional(),
    credits: z.number().optional(),
    course_type: z.enum(['水课', '专业课', '特殊课', '不确定']).optional(),
    study_mode: z.enum(['上课学习', '自学']).optional(),
    teacher_attitude: z.string().optional(),
    escape_difficulty: z.enum(['方便撤离', '不便撤离']).optional(),
    rollcall_methods: z.array(z.any()).optional(),
    catch_tolerance_per_class: z.number().optional(),
    max_catch_limit: z.number().optional(),
    exam_weeks: z.object({ mid: z.number().optional(), final: z.number().optional() }).nullable().optional(),
    notes: z.string().nullable().optional(),
});

export const CourseUpdateSchema = CourseInsertSchema.partial();

export const ProfileUpdateSchema = z.object({
    skip_motivation: z.array(z.string()).optional(),
    plan_start_date: z.string().nullable().optional(),
    plan_weeks: z.number().int().positive().optional(),
    weekly_skip_habit: z.number().int().nonnegative().optional(),
    weekly_skip_target: z.number().int().nonnegative().optional(),
    sub_cost_max: z.number().int().nonnegative().optional(),
    escape_rush_accept: z.boolean().optional(),
    commute_cost_minutes: z.number().int().nonnegative().optional(),
}).passthrough();

export const ConfigUpdateSchema = z.object({
    semester_start_date: z.string().nullable().optional(),
    semester_end_date: z.string().nullable().optional(),
    current_week: z.number().int().positive().nullable().optional(),
    current_day_of_week: z.number().int().min(1).max(7).nullable().optional(),
}).passthrough();

export const ContinueSessionSchema = z.object({
    review_id: z.string().min(1, 'review_id is required'),
    answers: z.array(z.object({
        question_id: z.string().min(1),
        answer: z.string(),
    })),
});
