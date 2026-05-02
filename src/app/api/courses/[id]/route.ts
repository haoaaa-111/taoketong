import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbCourses from '@/db/courses';
import * as dbMemory from '@/db/memory';
import { validateBody, CourseUpdateSchema } from '@/lib/validation';
import { handleError } from '@/lib/errors';

ensureDatabaseReady();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = dbCourses.getCourseById(Number(id));
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ course: data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const validation = await validateBody(request, CourseUpdateSchema);
        if ('response' in validation) return validation.response;

        dbCourses.updateCourse(Number(id), validation.data);
        dbMemory.updateCourseMemory(Number(id));
        return NextResponse.json({
            success: true,
            data: dbCourses.getCourseById(Number(id)),
        });
    } catch (e) {
        const errorResult = handleError(e);
        return NextResponse.json({ success: false, message: errorResult.message }, { status: errorResult.status });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    dbCourses.deleteCourse(Number(id));
    return NextResponse.json({ success: true });
}
