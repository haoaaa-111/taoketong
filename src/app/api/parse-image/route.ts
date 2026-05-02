import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import { parseScheduleImage } from '@/agents/parser';
import { standardErrorResponse, standardSanitizedErrorResponse, ERR_CODES } from '@/lib/errors';

ensureDatabaseReady();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;
        if (!file) {
            return standardErrorResponse('INVALID_REQUEST', '没有图片', undefined, 400);
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return standardErrorResponse(
                ERR_CODES.INVALID_FILE,
                '不支持的文件类型，仅支持 JPG/PNG/WEBP 图片',
                `收到: ${file.type}`,
                400
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return standardErrorResponse(
                ERR_CODES.FILE_TOO_LARGE,
                '文件过大，最大支持 10MB',
                `文件大小: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
                400
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
        return standardSanitizedErrorResponse(
            ERR_CODES.INTERNAL_ERROR,
            e
        );
    }
}
