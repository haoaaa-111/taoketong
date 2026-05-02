import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbCourses from '@/db/courses';
import * as dbMemory from '@/db/memory';

ensureDatabaseReady();

export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const data = dbCourses.getCourseById(Number(params.id));
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ course: data });
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const body = await request.json();
    dbCourses.updateCourse(Number(params.id), body);
    dbMemory.updateCourseMemory(Number(params.id));
    return NextResponse.json({
        success: true,
        data: dbCourses.getCourseById(Number(params.id)),
    });
}

export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    dbCourses.deleteCourse(Number(params.id));
    return NextResponse.json({ success: true });
}
