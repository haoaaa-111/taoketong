import { NextResponse } from 'next/server';
import { getRollcallWeeks, readRollcallByWeek, readConfig } from '@/data/fs-store';
import { handleError } from '@/lib/errors';
import type { RollcallSummary } from '@/types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const weeksParam = url.searchParams.get('weeks');
    const recentWeeks = parseInt(weeksParam || '2', 10);

    const config = readConfig();
    const currentWeek = config?.current_week ?? 1;

    const allWeeks = getRollcallWeeks();
    const startWeek = Math.max(1, currentWeek - recentWeeks);
    const targetWeeks = allWeeks.filter((w) => w >= startWeek && w < currentWeek);

    const summaries: Record<string, RollcallSummary> = {};
    for (const week of targetWeeks) {
      const events = readRollcallByWeek(week);
      if (events.length > 0) {
        summaries[`week${week}`] = {
          week,
          events,
          caughtCount: events.filter((e) => e.wasCaught).length,
          totalClasses: events.length,
        };
      }
    }

    return NextResponse.json({
      currentWeek,
      lookback: recentWeeks,
      summaries,
    });
  } catch (e) {
    const errorResult = handleError(e);
    return NextResponse.json({ error: errorResult.message }, { status: errorResult.status });
  }
}
