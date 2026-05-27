import { NextResponse } from 'next/server';
import { restorePlanVersion } from '@/data/fs-store';
import { handleError } from '@/lib/errors';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ week: string; timestamp: string }> }
) {
  try {
    const { week, timestamp } = await params;
    const weekNum = parseInt(week, 10);

    if (isNaN(weekNum) || weekNum < 1) {
      return NextResponse.json({ error: '无效的周次' }, { status: 400 });
    }

    if (!timestamp) {
      return NextResponse.json({ error: '缺少版本时间戳' }, { status: 400 });
    }

    const actions = restorePlanVersion(weekNum, timestamp);

    return NextResponse.json({
      success: true,
      message: `已恢复第 ${weekNum} 周的计划版本`,
      week: weekNum,
      actions,
    });
  } catch (e) {
    const errorResult = handleError(e);
    return NextResponse.json({ error: errorResult.message }, { status: errorResult.status });
  }
}
