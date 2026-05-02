import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbCourses from '@/db/courses';

ensureDatabaseReady();

export async function GET() {
    const data = dbCourses.getAllCoursesWithSchedules();
    return NextResponse.json({ courses: data });
}
