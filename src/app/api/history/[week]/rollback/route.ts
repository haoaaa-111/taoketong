import { NextResponse } from 'next/server';
import { readPlan, backupAndWritePlan, readConfig, writeConfig } from '@/data/fs-store';
import { handleError } from '@/lib/errors';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ week: string }> }
) {
  try {
    const { week } = await params;
    const sourceWeek = parseInt(week, 10);

    if (isNaN(sourceWeek) || sourceWeek < 1) {
      return NextResponse.json({ error: '无效的周次' }, { status: 400 });
    }

    const sourcePlan = readPlan(sourceWeek);
    if (sourcePlan.length === 0) {
      return NextResponse.json({ error: `第 ${sourceWeek} 周无计划数据` }, { status: 404 });
    }

    const config = readConfig();
    const currentWeek = config?.current_week ?? 1;

    const rolledActions = sourcePlan.map((a) => ({
      ...a,
      week: currentWeek,
    }));

    backupAndWritePlan(currentWeek, rolledActions);

    return NextResponse.json({
      success: true,
      message: `已从第 ${sourceWeek} 周回滚到第 ${currentWeek} 周`,
      week: currentWeek,
      actions: rolledActions,
    });
  } catch (e) {
    const errorResult = handleError(e);
    return NextResponse.json({ error: errorResult.message }, { status: errorResult.status });
  }
}
