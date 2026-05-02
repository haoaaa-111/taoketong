import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import { parseScheduleImage } from '@/agents/parser';

ensureDatabaseReady();

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;
        if (!file) {
            return NextResponse.json(
                { success: false, message: '没有图片' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString('base64');

        const result = await parseScheduleImage(base64);

        return NextResponse.json({
            success: true,
            courses: result.courses,
            semester_start: result.semester_start,
            semester_end: result.semester_end,
        });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: (e as Error).message },
            { status: 500 }
        );
    }
}
