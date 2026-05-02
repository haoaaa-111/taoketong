import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbCourses from '@/db/courses';

ensureDatabaseReady();

export async function GET() {
    const data = dbCourses.getAllCoursesWithSchedules();
    return NextResponse.json({ courses: data });
}

export async function POST(request: NextRequest) {
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

    const id = dbCourses.insertCourse({
        name: body.name,
        location: body.location,
        teacher_name: body.teacher_name,
        credits: body.credits,
        course_type: body.course_type,
        study_mode: body.study_mode,
        teacher_attitude: body.teacher_attitude,
        escape_difficulty: body.escape_difficulty,
        rollcall_methods: body.rollcall_methods,
        catch_tolerance_per_class: body.catch_tolerance_per_class,
        max_catch_limit: body.max_catch_limit,
        current_caught_count: 0,
        rollcall_history: [],
        exam_weeks: body.exam_weeks,
        notes: body.notes,
    });

    return NextResponse.json({ success: true, id });
}
