import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbCourses from '@/db/courses';
import { validateBody, CourseInsertSchema } from '@/lib/validation';

ensureDatabaseReady();

export async function GET() {
    const data = dbCourses.getAllCoursesWithSchedules();
    return NextResponse.json({ courses: data });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (body.schedule) {
            const id = dbCourses.insertSchedule({
                course_id: body.course_id,
                weeks: body.weeks,
                day_of_week: body.day_of_week,
                period_slot: body.period_slot,
            });
            return NextResponse.json({ success: true, id });
        }

        const validation = await validateBody(request, CourseInsertSchema);
        if ('response' in validation) return validation.response;

        const id = dbCourses.insertCourse({
            name: validation.data.name,
            location: validation.data.location ?? null,
            teacher_name: validation.data.teacher_name ?? null,
            credits: validation.data.credits ?? null,
            course_type: validation.data.course_type ?? '不确定',
            study_mode: validation.data.study_mode ?? '自学',
            teacher_attitude: validation.data.teacher_attitude ?? '不确定',
            escape_difficulty: validation.data.escape_difficulty ?? null,
            rollcall_methods: validation.data.rollcall_methods ?? [],
            catch_tolerance_per_class: validation.data.catch_tolerance_per_class ?? 5,
            max_catch_limit: validation.data.max_catch_limit ?? 3,
            current_caught_count: 0,
            rollcall_history: [],
            exam_weeks: validation.data.exam_weeks ?? null,
            notes: validation.data.notes ?? null,
        });

        return NextResponse.json({ success: true, id });
    } catch (e) {
        return NextResponse.json({ success: false, message: (e as Error).message }, { status: 500 });
    }
}
