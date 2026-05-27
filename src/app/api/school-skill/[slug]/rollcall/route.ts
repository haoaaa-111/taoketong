import { NextResponse } from 'next/server';
import { readSchoolRollcallSkill } from '@/data/fs-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;
  try {
    const content = readSchoolRollcallSkill(slug);
    if (content === null) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '学校策略文件不存在' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, content });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: String(e) } },
      { status: 500 },
    );
  }
}
