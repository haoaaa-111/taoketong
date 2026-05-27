import { readFileSync } from 'node:fs';
import type { PromptLayer } from '@/data/prompt-layers';
import type { PlanAction, RollcallEvent } from '@/types';
import { readProfile, readConfig, readPlan, readRollcallHistory, readCourseRefined, listCourseMetas } from '@/data/fs-store';
import { readRollcallRules } from './modeler';

export function buildSupervisorLayers(
  week: number,
  priorPlan?: PlanAction[],
  feedback?: string,
  retryHint?: string
): PromptLayer[] {
  const config = readConfig();
  const courseNames = listCourseMetas();
  const rollcallHistory = readRollcallHistory(undefined, 2);

  const layers: PromptLayer[] = [
    {
      name: 'user-profile',
      content: (() => {
        try { return readFileSync('data/meta/profile.md', 'utf-8'); }
        catch { return '暂无用户画像'; }
      })(),
    },
    {
      name: 'semester-context',
      content: formatSemesterContext(config, week),
    },
    {
      name: 'course-profiles',
      content: courseNames.map(name => {
        const refined = readCourseRefined(name);
        return `## ${name}\n${refined || '(未建模)'}`;
      }).join('\n\n'),
    },
    { name: 'rollcall-rules', content: readRollcallRules() },
    {
      name: 'recent-events',
      content: formatRecentEvents(rollcallHistory),
      condition: rollcallHistory.length > 0,
    },
    {
      name: 'prior-plan',
      content: formatPriorPlan(priorPlan),
      condition: !!priorPlan && priorPlan.length > 0,
    },
    {
      name: 'user-constraints',
      content: formatConstraints(feedback),
      condition: !!feedback,
    },
    {
      name: 'retry-hint',
      content: formatRetryHint(retryHint),
      condition: !!retryHint,
    },
  ];
  return layers;
}

function formatSemesterContext(config: { current_week?: number | null } | null, week: number): string {
  const currentWeek = config?.current_week ?? week;
  const totalWeeks = 16;
  const weeksToEnd = totalWeeks - week;
  return [
    `当前: 第 ${currentWeek}/${totalWeeks} 周`,
    `距学期结束: ${weeksToEnd} 周`,
    weeksToEnd <= 2 ? '⚠️ 临近学期末，点名可能增加' : '',
  ].filter(Boolean).join('\n');
}

function formatPriorPlan(priorPlan?: PlanAction[]): string {
  if (!priorPlan || priorPlan.length === 0) return '';
  return priorPlan.map(a =>
    `- 第${a.week}周 ${a.schedule_id}: ${a.action} (原因: ${a.reason})`
  ).join('\n');
}

function formatConstraints(feedback?: string): string {
  if (!feedback) return '';
  return `用户调整意见:\n${feedback}`;
}

function formatRetryHint(hint?: string): string {
  if (!hint) return '';
  return `⚠️ 上次方案未通过自检。问题:\n${hint}\n请修正。`;
}

function formatRecentEvents(events: RollcallEvent[]): string {
  if (events.length === 0) return '';
  const header = '| 日期 | 课程 | 计划 | 实际 | 被抓 | 点名方式 |';
  const separator = '|------|------|------|------|:---:|---------|';
  const rows = events.map(e =>
    `| ${e.date} | ${e.courseName} | ${e.plannedAction} | ${e.actualAction} | ${e.wasCaught ? '是' : '否'} | ${e.rollcallMethod || '—'} |`
  );
  return [header, separator, ...rows].join('\n');
}
