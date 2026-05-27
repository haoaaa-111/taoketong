import { NextResponse } from 'next/server';
import { listPlanWeeks, readPlan, readConfig, getRollcallWeeks, hasFeedbackForWeek } from '@/data/fs-store';
import { handleError } from '@/lib/errors';
import type { HistoryWeek } from '@/types';

export async function GET() {
  try {
    const config = readConfig();
    const currentWeek = config?.current_week ?? 1;
    const planWeeks = listPlanWeeks();
    const rollcallWeeks = getRollcallWeeks();

    const history: HistoryWeek[] = planWeeks.map((week) => ({
      week,
      planExists: true,
      feedbackExists: hasFeedbackForWeek(week),
      rollcallExists: rollcallWeeks.includes(week),
    }));

    return NextResponse.json({
      currentWeek,
      history: history.sort((a, b) => a.week - b.week),
    });
  } catch (e) {
    const errorResult = handleError(e);
    return NextResponse.json({ error: errorResult.message }, { status: errorResult.status });
  }
}
