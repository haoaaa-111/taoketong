import { NextResponse } from 'next/server';
import { readPlan, readRollcallByWeek, readAllFeedback } from '@/data/fs-store';
import { handleError } from '@/lib/errors';
import type { HistoryWeekDetail } from '@/types';

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

    const plan = readPlan(weekNum);
    const rollcallEvents = readRollcallByWeek(weekNum);

    let feedback = '';
    const allFeedback = readAllFeedback();
    if (allFeedback) {
      const weekPattern = new RegExp(`## [^\\n]+\\n\\n- \\*\\*Week\\*\\*: ${weekNum}[\\s\\S]*?(?=\\n## |$)`, 'g');
      const match = allFeedback.match(weekPattern);
      if (match) {
        feedback = match.join('\n');
      }
    }

    const detail: HistoryWeekDetail = {
      week: weekNum,
      plan,
      feedback: feedback || undefined,
      rollcallEvents,
      versions: [],
    };

    return NextResponse.json(detail);
  } catch (e) {
    const errorResult = handleError(e);
    return NextResponse.json({ error: errorResult.message }, { status: errorResult.status });
  }
}
