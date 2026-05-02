import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbCourses from '@/db/courses';
import * as dbMemory from '@/db/memory';

ensureDatabaseReady();

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const data = dbCourses.getCourseById(Number(id));
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ course: data });
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    dbCourses.updateCourse(Number(id), body);
    dbMemory.updateCourseMemory(Number(id));
    return NextResponse.json({
        success: true,
        data: dbCourses.getCourseById(Number(id)),
    });
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    dbCourses.deleteCourse(Number(id));
    return NextResponse.json({ success: true });
}
