import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CourseMeta,
  UserProfile,
  UserConfig,
  PlanAction,
  RollcallEvent,
  FeedbackData,
  CourseMetaSchedule,
  RollcallMethod,
  PlanVersion,
} from '../src/types';

// ─── Path Constants ───────────────────────────────────────────────────────────

const DATA_DIR = 'data';
const META_DIR = join(DATA_DIR, 'meta');
const COURSES_DIR = join(META_DIR, 'courses');
const REFINED_DIR = join(DATA_DIR, 'refined');
const PLANS_DIR = join(DATA_DIR, 'plans');
const FEEDBACK_DIR = join(DATA_DIR, 'feedback');
const ROLLCALL_SKILLS_DIR = join(DATA_DIR, 'rollcallskills');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function atomicWrite(filePath: string, content: string): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, content, 'utf-8');
  renameSync(tmpPath, filePath);
}

export function slugify(name: string): string {
  if (!name) return '';
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// ─── CourseMeta CRUD ──────────────────────────────────────────────────────────

export function readCourseMeta(courseName: string): CourseMeta {
  const filePath = join(COURSES_DIR, `${slugify(courseName)}.md`);
  if (!existsSync(filePath)) {
    throw new Error(`CourseMeta not found: ${courseName} (expected at ${filePath})`);
  }
  const md = readFileSync(filePath, 'utf-8');
  return parseCourseMarkdown(md);
}

export function writeCourseMeta(meta: CourseMeta): void {
  ensureDir(COURSES_DIR);
  const filePath = join(COURSES_DIR, `${slugify(meta.name)}.md`);
  atomicWrite(filePath, formatCourseMarkdown(meta));
}

export function listCourseMetas(): string[] {
  if (!existsSync(COURSES_DIR)) return [];
  return readdirSync(COURSES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

// ─── UserProfile / UserConfig CRUD ────────────────────────────────────────────

export function readProfile(): UserProfile | null {
  const filePath = join(META_DIR, 'profile.md');
  if (!existsSync(filePath)) return null;
  const md = readFileSync(filePath, 'utf-8');
  return parseProfileTable(md);
}

export function writeProfile(profile: UserProfile): void {
  ensureDir(META_DIR);
  const filePath = join(META_DIR, 'profile.md');
  atomicWrite(filePath, formatProfileTable(profile));
}

export function readConfig(): UserConfig | null {
  const filePath = join(META_DIR, 'config.md');
  if (!existsSync(filePath)) return null;
  const md = readFileSync(filePath, 'utf-8');
  return parseConfigTable(md);
}

export function writeConfig(config: UserConfig): void {
  ensureDir(META_DIR);
  const filePath = join(META_DIR, 'config.md');
  atomicWrite(filePath, formatConfigTable(config));
}

// ─── Refined Profiles ─────────────────────────────────────────────────────────

export function readCourseRefined(courseName: string): string {
  const file = join(REFINED_DIR, `${slugify(courseName)}.md`);
  if (!existsSync(file)) return '';
  return readFileSync(file, 'utf-8');
}

export function writeCourseRefined(courseName: string, content: string): void {
  ensureDir(REFINED_DIR);
  const filePath = join(REFINED_DIR, `${slugify(courseName)}.md`);
  atomicWrite(filePath, content);
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export function readPlan(week: number): PlanAction[] {
  const filePath = join(PLANS_DIR, `week-${week}.md`);
  if (!existsSync(filePath)) return [];
  const md = readFileSync(filePath, 'utf-8');
  return parsePlanTable(md);
}

export function writePlan(week: number, actions: PlanAction[]): void {
  ensureDir(PLANS_DIR);
  const filePath = join(PLANS_DIR, `week-${week}.md`);
  atomicWrite(filePath, formatPlanTable(week, actions));
}

export function listPlanWeeks(): number[] {
  if (!existsSync(PLANS_DIR)) return [];
  const weeks: number[] = [];
  for (const f of readdirSync(PLANS_DIR)) {
    const match = f.match(/^week-(\d+)\.md$/);
    if (match) weeks.push(parseInt(match[1], 10));
  }
  return weeks.sort((a, b) => a - b);
}

// ─── Plan Version Control (Archive) ────────────────────────────────────────────

const PLANS_ARCHIVE_DIR = join(PLANS_DIR, 'archive');

export function backupAndWritePlan(week: number, actions: PlanAction[]): void {
  ensureDir(PLANS_DIR);
  const filePath = join(PLANS_DIR, `week-${week}.md`);

  if (existsSync(filePath)) {
    ensureDir(PLANS_ARCHIVE_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = join(PLANS_ARCHIVE_DIR, `week-${week}-${timestamp}.md`);
    copyFileSync(filePath, archivePath);
  }

  atomicWrite(filePath, formatPlanTable(week, actions));
}

export function readPlanVersions(week: number): PlanVersion[] {
  const versions: PlanVersion[] = [];
  const currentPath = join(PLANS_DIR, `week-${week}.md`);

  if (existsSync(currentPath)) {
    const stat = statSync(currentPath);
    versions.push({
      timestamp: stat.mtime.toISOString(),
      fileName: `week-${week}.md`,
      isCurrent: true,
    });
  }

  if (existsSync(PLANS_ARCHIVE_DIR)) {
    for (const f of readdirSync(PLANS_ARCHIVE_DIR)) {
      const match = f.match(new RegExp(`^week-${week}-(.+)\\.md$`));
      if (match) {
        const tsRaw = match[1].replace(/-/g, ':').replace(/(\d{2}):(\d{2}):(\d{2}):(\d{3})Z$/, '$1:$2:$3.$4Z');
        versions.push({
          timestamp: tsRaw,
          fileName: f,
          isCurrent: false,
        });
      }
    }
  }

  return versions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function restorePlanVersion(week: number, timestamp: string): PlanAction[] {
  const safeTimestamp = timestamp.replace(/[:.]/g, '-');
  const archivePath = join(PLANS_ARCHIVE_DIR, `week-${week}-${safeTimestamp}.md`);

  if (!existsSync(archivePath)) {
    throw new Error(`Archived version not found: week-${week}-${safeTimestamp}.md`);
  }

  const currentPath = join(PLANS_DIR, `week-${week}.md`);
  if (existsSync(currentPath)) {
    const backupTs = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(PLANS_ARCHIVE_DIR, `week-${week}-${backupTs}.md`);
    copyFileSync(currentPath, backupPath);
  }

  const md = readFileSync(archivePath, 'utf-8');
  const actions = parsePlanTable(md);

  atomicWrite(currentPath, md);
  return actions;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export function appendFeedback(date: string, data: FeedbackData): void {
  ensureDir(FEEDBACK_DIR);
  const filePath = join(FEEDBACK_DIR, 'feedback.md');

  let existing = '';
  if (existsSync(filePath)) {
    existing = readFileSync(filePath, 'utf-8');
  }

  const section = formatFeedbackSection(date, data);
  const content = existing ? existing + '\n' + section : section;
  writeFileSync(filePath, content, 'utf-8');
}

export function readAllFeedback(): string {
  const filePath = join(FEEDBACK_DIR, 'feedback.md');
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf-8');
}

export function hasFeedbackForWeek(week: number): boolean {
  const content = readAllFeedback();
  if (!content) return false;
  const pattern = new RegExp(`^\\- \\*\\*Week\\*\\*: ${week}$`, 'm');
  return pattern.test(content);
}

// ─── Rollcall History ─────────────────────────────────────────────────────────

const ROLLCALL_HISTORY_FILE = join(DATA_DIR, 'rollcall-history.md');

export function readRollcallHistory(
  courseName?: string,
  weeksBack?: number
): RollcallEvent[] {
  if (!existsSync(ROLLCALL_HISTORY_FILE)) return [];

  const md = readFileSync(ROLLCALL_HISTORY_FILE, 'utf-8');
  let events = parseRollcallTable(md);

  if (courseName) {
    events = events.filter((e) => e.courseName === courseName);
  }

  if (weeksBack !== undefined) {
    const cutoffMs = Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000;
    events = events.filter((e) => {
      const eventDate = new Date(e.date).getTime();
      return eventDate >= cutoffMs;
    });
  }

  return events;
}

export function readRollcallByWeek(week: number): RollcallEvent[] {
  if (!existsSync(ROLLCALL_HISTORY_FILE)) return [];
  const md = readFileSync(ROLLCALL_HISTORY_FILE, 'utf-8');
  const allEvents = parseRollcallTable(md);
  return allEvents.filter((e) => e.week === week);
}

export function getRollcallWeeks(): number[] {
  if (!existsSync(ROLLCALL_HISTORY_FILE)) return [];
  const md = readFileSync(ROLLCALL_HISTORY_FILE, 'utf-8');
  const allEvents = parseRollcallTable(md);
  const weekSet = new Set<number>();
  for (const e of allEvents) {
    if (e.week !== undefined) weekSet.add(e.week);
  }
  return [...weekSet].sort((a, b) => a - b);
}

export function appendRollcallEvent(week: number, event: RollcallEvent): void {
  const row = formatRollcallEvent(week, event);

  if (!existsSync(ROLLCALL_HISTORY_FILE)) {
    const header =
      '| date | week | scheduleId | courseName | plannedAction | actualAction | wasCaught | rollcallMethod | attendanceRate |\n' +
      '|------|------|------------|------------|---------------|-------------|-----------|----------------|----------------|\n';
    writeFileSync(ROLLCALL_HISTORY_FILE, header + row + '\n', 'utf-8');
  } else {
    let content = readFileSync(ROLLCALL_HISTORY_FILE, 'utf-8');
    content = content + row + '\n';
    writeFileSync(ROLLCALL_HISTORY_FILE, content, 'utf-8');
  }
}

// ─── Session Log ──────────────────────────────────────────────────────────────

const SESSION_LOG_FILE = join(PLANS_DIR, 'session-log.md');

export function appendSessionLog(entry: { sessionId: string; actions: PlanAction[]; generatedAt: string }): void {
  ensureDir(PLANS_DIR);
  const timestamp = entry.generatedAt;
  const summary = `## Session ${entry.sessionId}\n- 生成时间: ${timestamp}\n- Actions: ${entry.actions.length}\n`;
  const existing = existsSync(SESSION_LOG_FILE) ? readFileSync(SESSION_LOG_FILE, 'utf-8') : '';
  writeFileSync(SESSION_LOG_FILE, summary + '\n' + existing, 'utf-8');
}

export function readSessionLog(): { session: { session_id: string }; actions: PlanAction[] } | null {
  if (!existsSync(SESSION_LOG_FILE)) return null;

  const content = readFileSync(SESSION_LOG_FILE, 'utf-8');
  const match = content.match(/^## Session (\d+)/m);
  if (!match) return null;

  const actions: PlanAction[] = [];
  if (existsSync(PLANS_DIR)) {
    const files = readdirSync(PLANS_DIR).filter(f => f.startsWith('week-') && f.endsWith('.md'));
    for (const f of files) {
      const weekPlan = readFileSync(join(PLANS_DIR, f), 'utf-8');
      actions.push(...parsePlanTable(weekPlan));
    }
  }

  return { session: { session_id: match[1] }, actions };
}

// ─── initDataDirs ─────────────────────────────────────────────────────────────

export function initDataDirs(): void {
  ensureDir(COURSES_DIR);
  ensureDir(REFINED_DIR);
  ensureDir(PLANS_DIR);
  ensureDir(FEEDBACK_DIR);
  ensureDir(ROLLCALL_SKILLS_DIR);
}

// ─── School Rollcall Skills ────────────────────────────────────────────────────

export function readSchoolRollcallSkill(schoolSlug: string): string | null {
  const file = join(ROLLCALL_SKILLS_DIR, schoolSlug, 'rollcall.md');
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf-8');
}

export function writeSchoolRollcallSkill(schoolSlug: string, rollcallMd: string): void {
  const dir = join(ROLLCALL_SKILLS_DIR, schoolSlug);
  ensureDir(dir);
  atomicWrite(join(dir, 'rollcall.md'), rollcallMd);
}

export function listSchoolSkills(): string[] {
  if (!existsSync(ROLLCALL_SKILLS_DIR)) return [];
  return readdirSync(ROLLCALL_SKILLS_DIR)
    .filter((f) => {
      const full = join(ROLLCALL_SKILLS_DIR, f);
      try { return existsSync(full) && readdirSync(full).length > 0; } catch { return false; }
    })
    .filter((f) => !f.startsWith('.'));
}

export function readSchoolSkillMeta(schoolSlug: string): Record<string, unknown> | null {
  const file = join(ROLLCALL_SKILLS_DIR, schoolSlug, 'meta.json');
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf-8'));
}

export function readTeacherOverride(schoolSlug: string, teacherType: string): string | null {
  const file = join(ROLLCALL_SKILLS_DIR, schoolSlug, 'teachers', `${teacherType}.md`);
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN FORMAT / PARSE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── formatCourseMeta: Human-readable markdown for LLM consumption ────────────

export function formatCourseMeta(meta: CourseMeta): string {
  const lines: string[] = [];
  lines.push(`## ${meta.name}\n`);
  lines.push('| 属性 | 值 |');
  lines.push('|------|-----|');
  lines.push(`| 课程类型 | ${meta.courseType} |`);
  lines.push(`| 学习模式 | ${meta.studyMode} |`);
  lines.push(`| 教师态度 | ${meta.teacherAttitude} |`);
  lines.push(`| 撤离难度 | ${meta.evacuationDifficulty} |`);
  lines.push(`| 单次课容忍被抓 | ${meta.caughtTolerance} |`);
  lines.push(`| 最大被抓次数 | ${meta.maxCaughtCount} |`);
  lines.push(`| 考试周 | ${formatExamWeeks(meta.examWeeks)} |`);
  lines.push(`| 备注 | ${meta.notes || '-'} |`);
  if (meta.infoStatus) {
    lines.push(`| 信息状态 | ${meta.infoStatus} |`);
  }

  if (meta.rollcallMethods && meta.rollcallMethods.length > 0) {
    lines.push('');
    lines.push('### 点名方式');
    lines.push('| 方式 | 频率 |');
    lines.push('|------|------|');
    for (const rm of meta.rollcallMethods) {
      lines.push(`| ${rm.method} | ${rm.frequency} |`);
    }
  }

  if (meta.schedules && meta.schedules.length > 0) {
    lines.push('');
    lines.push('### 课表');
    lines.push('| scheduleId | 周几 | 节次 | 周数 |');
    lines.push('|------------|------|------|------|');
    for (const s of meta.schedules) {
      lines.push(`| ${s.scheduleId} | ${s.dayOfWeek} | ${s.period} | ${s.weeks.join(',')} |`);
    }
  }

  return lines.join('\n');
}

function formatExamWeeks(ew: unknown): string {
  if (ew === null || ew === undefined) return '-';
  if (Array.isArray(ew)) return (ew as number[]).join(',');
  if (typeof ew === 'object') {
    const obj = ew as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.mid !== undefined && obj.mid !== null) parts.push(`期中:${obj.mid}`);
    if (obj.final !== undefined && obj.final !== null) parts.push(`期末:${obj.final}`);
    return parts.length > 0 ? parts.join(', ') : '-';
  }
  return String(ew);
}

// ─── formatCourseMarkdown: Storage format (parseable) ──────────────────────────

export function formatCourseMarkdown(meta: CourseMeta): string {
  const lines: string[] = [];

  lines.push(`name: ${meta.name}`);
  lines.push(`courseType: ${meta.courseType}`);
  lines.push(`studyMode: ${meta.studyMode}`);
  lines.push(`teacherAttitude: ${meta.teacherAttitude}`);
  lines.push(`escapeDifficulty: ${meta.evacuationDifficulty}`);
  lines.push(`caughtTolerance: ${meta.caughtTolerance}`);
  lines.push(`maxCaughtCount: ${meta.maxCaughtCount}`);
  lines.push(`examWeeks: ${serializeExamWeeks(meta.examWeeks)}`);
  lines.push(`notes: ${meta.notes ?? ''}`);
  if (meta.infoStatus !== undefined) {
    lines.push(`infoStatus: ${meta.infoStatus}`);
  }

  if (meta.rollcallMethods && meta.rollcallMethods.length > 0) {
    lines.push('');
    lines.push('## RollcallMethods');
    for (const rm of meta.rollcallMethods) {
      lines.push(`${rm.method}|${rm.frequency}`);
    }
  }

  if (meta.schedules && meta.schedules.length > 0) {
    lines.push('');
    lines.push('## Schedules');
    for (const s of meta.schedules) {
      lines.push(`${s.scheduleId}|${s.dayOfWeek}|${s.period}|${s.weeks.join(',')}`);
    }
  }

  return lines.join('\n');
}

function serializeExamWeeks(ew: unknown): string {
  if (ew === null || ew === undefined) return '';
  if (Array.isArray(ew)) return (ew as number[]).join(',');
  if (typeof ew === 'object') {
    const obj = ew as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.mid !== undefined && obj.mid !== null) parts.push(`mid:${obj.mid}`);
    if (obj.final !== undefined && obj.final !== null) parts.push(`final:${obj.final}`);
    return parts.join(',');
  }
  return String(ew);
}

// ─── parseCourseMarkdown: Inverse of formatCourseMarkdown ─────────────────────

export function parseCourseMarkdown(md: string): CourseMeta {
  const lines = md.split('\n');
  const meta: Record<string, unknown> = {};
  const rollcallMethods: RollcallMethod[] = [];
  const schedules: CourseMetaSchedule[] = [];
  let section: 'header' | 'rollcall' | 'schedules' = 'header';
  let name = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (trimmed === '## RollcallMethods') {
      section = 'rollcall';
      continue;
    }
    if (trimmed === '## Schedules') {
      section = 'schedules';
      continue;
    }

    switch (section) {
      case 'header': {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        if (key === 'name') {
          name = value;
        } else if (key === 'caughtTolerance' || key === 'maxCaughtCount') {
          meta[key] = parseInt(value, 10);
        } else {
          meta[key] = value;
        }
        break;
      }
      case 'rollcall': {
        const parts = trimmed.split('|');
        if (parts.length >= 2) {
          rollcallMethods.push({
            method: parts[0].trim(),
            frequency: parts[1].trim(),
          });
        }
        break;
      }
      case 'schedules': {
        const parts = trimmed.split('|');
        if (parts.length >= 4) {
          schedules.push({
            scheduleId: parseInt(parts[0].trim(), 10),
            dayOfWeek: parts[1].trim(),
            period: parts[2].trim(),
            weeks: parts[3]
              .trim()
              .split(',')
              .map((w) => parseInt(w.trim(), 10))
              .filter((w) => !isNaN(w)),
          });
        }
        break;
      }
    }
  }

  return {
    name: name || (meta['name'] as string),
    courseType: (meta['courseType'] as string) || '',
    studyMode: (meta['studyMode'] as string) || '',
    teacherAttitude: (meta['teacherAttitude'] as string) || '',
    evacuationDifficulty: (meta['escapeDifficulty'] as string) || '',
    caughtTolerance: (meta['caughtTolerance'] as number) ?? 0,
    maxCaughtCount: (meta['maxCaughtCount'] as number) ?? 0,
    examWeeks: parseSerializedExamWeeks(meta['examWeeks'] as string),
    notes: (meta['notes'] as string) || null,
    rollcallMethods,
    schedules,
    ...(meta['infoStatus'] ? { infoStatus: meta['infoStatus'] as string } : {}),
  } as CourseMeta;
}

function parseSerializedExamWeeks(raw: string | undefined): unknown {
  if (!raw || raw.trim() === '') return null;
  if (raw.includes(':')) {
    const obj: Record<string, number> = {};
    for (const part of raw.split(',')) {
      const [k, v] = part.split(':');
      if (k && v) obj[k.trim()] = parseInt(v.trim(), 10);
    }
    return obj;
  }
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

// ─── formatRollcallEvent ──────────────────────────────────────────────────────

export function formatRollcallEvent(week: number, event: RollcallEvent): string {
  const cells = [
    event.date,
    String(week),
    String(event.scheduleId),
    event.courseName,
    event.plannedAction,
    event.actualAction,
    String(event.wasCaught),
    event.rollcallMethod ?? '',
    event.attendanceRate !== undefined ? String(event.attendanceRate) : '',
  ];
  return '| ' + cells.join(' | ') + ' |';
}

// ─── parseRollcallTable ───────────────────────────────────────────────────────

export function parseRollcallTable(md: string): RollcallEvent[] {
  const lines = md.split('\n');
  const events: RollcallEvent[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.startsWith('| date') ||
      trimmed.startsWith('|------') ||
      trimmed === ''
    ) {
      if (trimmed.startsWith('| date')) inTable = true;
      if (trimmed.startsWith('|------')) continue;
      continue;
    }

    if (!inTable || !trimmed.startsWith('|')) continue;

    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '');

    if (cells.length < 7) continue;

    events.push({
      date: cells[0],
      week: cells[1] ? parseInt(cells[1], 10) : undefined,
      scheduleId: parseInt(cells[2], 10),
      courseName: cells[3],
      plannedAction: cells[4],
      actualAction: cells[5],
      wasCaught: cells[6] === 'true',
      ...(cells[7] ? { rollcallMethod: cells[7] } : {}),
      ...(cells[8] && cells[8] !== ''
        ? { attendanceRate: parseFloat(cells[8]) }
        : {}),
    } as RollcallEvent);
  }

  return events;
}

// ─── Profile Table Format/Parse ───────────────────────────────────────────────

function formatProfileTable(profile: UserProfile): string {
  const rows: string[] = [];
  rows.push('| field | value |');
  rows.push('|-------|-------|');
  rows.push(`| skip_motivation | ${profile.skip_motivation.join(', ')} |`);
  rows.push(`| plan_start_date | ${profile.plan_start_date ?? ''} |`);
  rows.push(`| plan_weeks | ${profile.plan_weeks} |`);
  rows.push(`| weekly_skip_habit | ${profile.weekly_skip_habit} |`);
  rows.push(`| weekly_skip_target | ${profile.weekly_skip_target} |`);
  rows.push(`| sub_cost_max | ${profile.sub_cost_max} |`);
  rows.push(`| escape_rush_accept | ${profile.escape_rush_accept} |`);
  rows.push(`| commute_cost_minutes | ${profile.commute_cost_minutes} |`);
  rows.push(`| has_completed_onboarding | ${profile.has_completed_onboarding} |`);
  rows.push(`| school_name | ${profile.school_name ?? ''} |`);
  rows.push(`| school_strategy_raw | ${profile.school_strategy_raw ?? ''} |`);
  rows.push(`| school_skill_slug | ${profile.school_skill_slug ?? ''} |`);
  rows.push(`| created_at | ${profile.created_at} |`);
  rows.push(`| updated_at | ${profile.updated_at} |`);
  return rows.join('\n');
}

function parseProfileTable(md: string): UserProfile {
  const profile: Record<string, unknown> = {};
  const lines = md.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed === '' ||
      trimmed.startsWith('| field') ||
      trimmed.startsWith('|-------')
    )
      continue;

    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '');

    if (cells.length < 2) continue;

    const key = cells[0];
    const value = cells[1];

    switch (key) {
      case 'skip_motivation':
        profile[key] = value ? value.split(',').map((s) => s.trim()) : [];
        break;
      case 'plan_start_date':
        profile[key] = value || null;
        break;
      case 'plan_weeks':
      case 'weekly_skip_habit':
      case 'weekly_skip_target':
      case 'sub_cost_max':
      case 'commute_cost_minutes':
        profile[key] = value ? parseInt(value, 10) : 0;
        break;
      case 'escape_rush_accept':
      case 'has_completed_onboarding':
        profile[key] = value === 'true';
        break;
      case 'school_name':
      case 'school_strategy_raw':
      case 'school_skill_slug':
      default:
        profile[key] = value;
        break;
    }
  }

  return {
    id: (profile['id'] as number) ?? 1,
    skip_motivation: (profile['skip_motivation'] as string[]) ?? [],
    plan_start_date: (profile['plan_start_date'] as string | null) ?? null,
    plan_weeks: (profile['plan_weeks'] as number) ?? 0,
    weekly_skip_habit: (profile['weekly_skip_habit'] as number) ?? 0,
    weekly_skip_target: (profile['weekly_skip_target'] as number) ?? 0,
    sub_cost_max: (profile['sub_cost_max'] as number) ?? 0,
    escape_rush_accept: (profile['escape_rush_accept'] as boolean) ?? false,
    commute_cost_minutes: (profile['commute_cost_minutes'] as number) ?? 0,
    has_completed_onboarding:
      (profile['has_completed_onboarding'] as boolean) ?? false,
    school_name: (profile['school_name'] as string | undefined) ?? undefined,
    school_strategy_raw:
      (profile['school_strategy_raw'] as string | undefined) ?? undefined,
    school_skill_slug:
      (profile['school_skill_slug'] as string | undefined) ?? undefined,
    created_at: (profile['created_at'] as string) ?? new Date().toISOString(),
    updated_at: (profile['updated_at'] as string) ?? new Date().toISOString(),
  } as UserProfile;
}

// ─── Config Table Format/Parse ────────────────────────────────────────────────

function formatConfigTable(config: UserConfig): string {
  const rows: string[] = [];
  rows.push('| key | value |');
  rows.push('|-----|-------|');
  rows.push(`| semester_start_date | ${config.semester_start_date ?? ''} |`);
  rows.push(`| semester_end_date | ${config.semester_end_date ?? ''} |`);
  rows.push(`| current_week | ${config.current_week ?? ''} |`);
  rows.push(`| current_day_of_week | ${config.current_day_of_week ?? ''} |`);
  rows.push(`| created_at | ${config.created_at} |`);
  rows.push(`| updated_at | ${config.updated_at} |`);
  return rows.join('\n');
}

function parseConfigTable(md: string): UserConfig {
  const config: Record<string, unknown> = {};
  const lines = md.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed === '' ||
      trimmed.startsWith('| key') ||
      trimmed.startsWith('|-----')
    )
      continue;

    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '');

    if (cells.length < 2) continue;

    const key = cells[0];
    const value = cells[1];

    switch (key) {
      case 'semester_start_date':
      case 'semester_end_date':
        config[key] = value || null;
        break;
      case 'current_week':
      case 'current_day_of_week':
        config[key] = value ? parseInt(value, 10) : null;
        break;
      default:
        config[key] = value;
        break;
    }
  }

  return {
    id: (config['id'] as number) ?? 1,
    semester_start_date:
      (config['semester_start_date'] as string | null) ?? null,
    semester_end_date:
      (config['semester_end_date'] as string | null) ?? null,
    current_week: (config['current_week'] as number | null) ?? null,
    current_day_of_week:
      (config['current_day_of_week'] as number | null) ?? null,
    created_at: (config['created_at'] as string) ?? new Date().toISOString(),
    updated_at: (config['updated_at'] as string) ?? new Date().toISOString(),
  } as UserConfig;
}

// ─── Plan Table Format/Parse ─────────────────────────────────────────────────

function formatPlanTable(week: number, actions: PlanAction[]): string {
  const lines: string[] = [];
  lines.push(`# Week ${week} Plan\n`);
  lines.push('| id | session_id | schedule_id | week | action | reason |');
  lines.push('|----|------------|------------|------|--------|--------|');

  for (const a of actions) {
    lines.push(
      `| ${a.id} | ${a.session_id} | ${a.schedule_id} | ${a.week} | ${a.action} | ${a.reason ?? ''} |`
    );
  }

  return lines.join('\n');
}

function parsePlanTable(md: string): PlanAction[] {
  const lines = md.split('\n');
  const actions: PlanAction[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('|----'))
      continue;
    if (trimmed.startsWith('| id')) {
      inTable = true;
      continue;
    }

    if (!inTable || !trimmed.startsWith('|')) continue;

    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '');

    if (cells.length < 6) continue;

    actions.push({
      id: parseInt(cells[0], 10),
      session_id: parseInt(cells[1], 10),
      schedule_id: parseInt(cells[2], 10),
      week: parseInt(cells[3], 10),
      action: cells[4],
      reason: cells[5] || null,
    } as PlanAction);
  }

  return actions;
}

// ─── Feedback Section Format ──────────────────────────────────────────────────

function formatFeedbackSection(date: string, data: FeedbackData): string {
  const lines: string[] = [];
  lines.push(`## ${date}`);
  lines.push('');
  lines.push(`- **Week**: ${data.week}`);
  lines.push(`- **Notes**: ${data.notes}`);
  lines.push(`- **Events**: ${data.actualEvents.length}`);

  if (data.actualEvents.length > 0) {
    lines.push('');
    lines.push(
      '| date | courseName | plannedAction | actualAction | wasCaught |'
    );
    lines.push(
      '|------|------------|---------------|-------------|-----------|'
    );
    for (const e of data.actualEvents) {
      lines.push(
        `| ${e.date} | ${e.courseName} | ${e.plannedAction} | ${e.actualAction} | ${e.wasCaught} |`
      );
    }
  }

  return lines.join('\n');
}
