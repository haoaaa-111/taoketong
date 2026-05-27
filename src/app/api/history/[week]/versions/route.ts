import { NextResponse } from 'next/server';
import { readPlanVersions } from '@/data/fs-store';
import { handleError } from '@/lib/errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ week: string }> }
) {
  try {
    const { week } = await params;
    const weekNum = parseInt(week, 10);

    if (isNaN(weekNum) || weekNum < 1) {
      return NextResponse.json({ error: '无效的周次' }, { status: 400 });
    }

    const versions = readPlanVersions(weekNum);

    return NextResponse.json({
      week: weekNum,
      versions,
    });
  } catch (e) {
    const errorResult = handleError(e);
    return NextResponse.json({ error: errorResult.message }, { status: errorResult.status });
  }
}
