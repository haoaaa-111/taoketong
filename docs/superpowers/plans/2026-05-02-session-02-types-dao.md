# Session 02 — TypeScript 类型定义 + DAO 层

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成全局类型定义和所有 DAO 数据访问函数，使数据层完全可用。

**Architecture:** 纯 Typescript 模块。`src/types/index.ts` 存放所有类型定义。`src/db/` 下 5 个 DAO 文件分别管理课程、用户画像、方案、反馈、记忆的 CRUD。

**Tech Stack:** TypeScript strict, better-sqlite3

**Source docs:**
- `dev-doc.md` Section 一(1.3), 二
- `design-spec.md` Section 二, 七

**前置依赖:** Session 01（项目 + DB schema 已完成）

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/types/index.ts` | 创建 | 全局类型 + 枚举 + 常量 |
| `src/db/courses.ts` | 创建 | Course + CourseSchedule CRUD |
| `src/db/profile.ts` | 创建 | UserProfile + UserConfig CRUD |
| `src/db/sessions.ts` | 创建 | PlanSession + PlanAction CRUD |
| `src/db/feedback.ts` | 创建 | ImmediateFeedback + WeeklyFeedback |
| `src/db/memory.ts` | 创建 | CourseMemory 快照管理 |

---

### Task 1: 全局类型定义

- [ ] **Step 1: 创建 `src/types/index.ts`**

写入以下完整内容：

```typescript
// === 枚举常量 ===
export const COURSE_TYPES = ['水课', '专业课', '特殊课', '不确定'] as const;
export const STUDY_MODES = ['上课学习', '自学'] as const;
export const TEACHER_ATTITUDES = ['严抓', '理解', '懒得管'] as const;
export const ESCAPE_DIFFICULTIES = ['方便撤离', '不便撤离'] as const;
export const RISK_LEVELS = ['无风险', '低风险', '中风险', '高风险', '未评估'] as const;
export const ACTION_TYPES = ['上课', '逃课', '签退'] as const;
export const SESSION_STATUSES = ['draft', 'accepted', 'rejected'] as const;
export const PERIOD_SLOTS = ['早一', '早二', '午一', '午二', '晚'] as const;
export const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
export const EVENT_TYPES = ['点名预警', '交作业', '调课', '补课', '其他'] as const;
export const ROLLCALL_FREQUENCIES = ['偶尔', '经常', '一直'] as const;

export const ROLLCALL_METHODS = [
    '抽点', '全点名', '位置签到', '可截图扫码', '需到场扫码', '签名表签到',
] as const;

// === 数据库类型 ===
export interface UserConfig {
    id: number;
    semester_start_date: string | null;
    semester_end_date: string | null;
    current_week: number | null;
    current_day_of_week: number | null;
    created_at: string;
    updated_at: string;
}

export interface UserProfile {
    id: number;
    skip_motivation: string[];
    plan_start_date: string | null;
    plan_weeks: number;
    weekly_skip_habit: number;
    weekly_skip_target: number;
    sub_cost_max: number;
    escape_rush_accept: boolean;
    commute_cost_minutes: number;
    has_completed_onboarding: boolean;
    created_at: string;
    updated_at: string;
}

export interface Course {
    id: number;
    name: string;
    location: string | null;
    teacher_name: string | null;
    credits: number | null;
    course_type: typeof COURSE_TYPES[number];
    study_mode: typeof STUDY_MODES[number];
    teacher_attitude: typeof TEACHER_ATTITUDES[number] | string;
    escape_difficulty: typeof ESCAPE_DIFFICULTIES[number] | null;
    rollcall_methods: RollcallMethodEntry[];
    catch_tolerance_per_class: number;
    max_catch_limit: number;
    current_caught_count: number;
    rollcall_history: string[];
    exam_weeks: ExamWeeks | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface RollcallMethodEntry {
    method: typeof ROLLCALL_METHODS[number] | string;
    frequency: typeof ROLLCALL_FREQUENCIES[number] | string;
}

export interface ExamWeeks {
    mid?: number;
    final?: number;
}

export interface CourseSchedule {
    id: number;
    course_id: number;
    weeks: number[];
    day_of_week: number;
    period_slot: typeof PERIOD_SLOTS[number];
}

export interface PlanSession {
    id: number;
    plan_start_date: string;
    plan_end_date: string;
    status: typeof SESSION_STATUSES[number];
    created_at: string;
}

export interface PlanAction {
    id: number;
    session_id: number;
    schedule_id: number;
    action: typeof ACTION_TYPES[number];
    reason: string | null;
}

export interface ImmediateFeedback {
    id: number;
    session_id: number;
    decision: 'accepted' | 'rejected';
    adjustment_notes: string | null;
    created_at: string;
}

export interface WeeklyFeedback {
    id: number;
    session_id: number;
    rating: number | null;
    was_caught: boolean;
    caught_courses: number[] | null;
    actual_events: PlanEvent[] | null;
    memory_updates: string | null;
    comment: string | null;
    created_at: string;
}

export interface PlanEvent {
    id?: number;
    course_id: number;
    event_type: typeof EVENT_TYPES[number];
    event_text: string;
    event_date: string;
}

export interface CourseMemory {
    id: number;
    course_id: number;
    snapshot_data: string;
    last_updated: string;
}

// === 输入/输出类型 ===
export interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: typeof PERIOD_SLOTS[number];
}

export interface CourseWithSchedules {
    course: Course;
    schedules: CourseSchedule[];
}

export interface SessionResult {
    success: boolean;
    session_id: number;
    actions: PlanAction[];
    message?: string;
}

export interface ModelerOutput {
    course_id: number;
    risk_level: typeof RISK_LEVELS[number];
    risk_reason: string;
    next_caught_probability: number;
}

// === Period Slot 工具 ===
export const PERIOD_TIME_DEFAULTS: Record<typeof PERIOD_SLOTS[number], { start: string; end: string }> = {
    '早一': { start: '08:00', end: '09:40' },
    '早二': { start: '10:00', end: '11:40' },
    '午一': { start: '14:00', end: '15:40' },
    '午二': { start: '16:00', end: '17:40' },
    '晚': { start: '19:00', end: '21:00' },
};
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 2: Course DAO

- [ ] **Step 1: 创建 `src/db/courses.ts`**

```typescript
import { db } from './index';
import type { Course, CourseSchedule, CourseWithSchedules } from '@/types';

export function getAllCoursesWithSchedules(): CourseWithSchedules[] {
    const courses = db.prepare('SELECT * FROM course').all() as Course[];
    return courses.map(course => ({
        course,
        schedules: db.prepare('SELECT * FROM course_schedule WHERE course_id = ?')
            .all(course.id) as CourseSchedule[],
    }));
}

export function getCourseById(id: number): CourseWithSchedules | null {
    const course = db.prepare('SELECT * FROM course WHERE id = ?').get(id) as Course | undefined;
    if (!course) return null;
    return {
        course,
        schedules: db.prepare('SELECT * FROM course_schedule WHERE course_id = ?')
            .all(id) as CourseSchedule[],
    };
}

export function updateCourse(id: number, data: Partial<Course>): void {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    const columns = entries.map(([k]) => k);
    const values = entries.map(([_, v]) => v);
    if (columns.length === 0) return;

    // JSON 字段需要序列化
    const jsonFields = ['rollcall_methods', 'rollcall_history', 'exam_weeks'];
    const finalValues = values.map((v, i) => {
        if (jsonFields.includes(columns[i]) && typeof v !== 'string') {
            return JSON.stringify(v);
        }
        return v;
    });

    db.prepare(
        `UPDATE course SET ${columns.map(c => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...finalValues, id);
}

export function deleteCourse(id: number): void {
    db.prepare('DELETE FROM course WHERE id = ?').run(id);
}

export function insertCourse(data: Omit<Course, 'id' | 'created_at' | 'updated_at'>): number {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?');
    const values = Object.values(data);

    const jsonFields = ['rollcall_methods', 'rollcall_history', 'exam_weeks'];
    const finalValues = values.map((v, i) => {
        if (jsonFields.includes(keys[i]) && typeof v !== 'string') {
            return JSON.stringify(v);
        }
        return v;
    });

    const result = db.prepare(
        `INSERT INTO course (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`
    ).run(finalValues);

    return result.lastInsertRowid as number;
}

export function insertSchedule(data: Omit<CourseSchedule, 'id'>): number {
    const result = db.prepare(
        'INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot) VALUES (?, ?, ?, ?)'
    ).run(
        data.course_id,
        JSON.stringify(data.weeks),
        data.day_of_week,
        data.period_slot
    );
    return result.lastInsertRowid as number;
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 3: Profile DAO

- [ ] **Step 1: 创建 `src/db/profile.ts`**

```typescript
import { db } from './index';
import type { UserProfile, UserConfig } from '@/types';

const PROFILE_ID = 1;
const CONFIG_ID = 1;

export function getProfile(): UserProfile | null {
    const row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get(PROFILE_ID);
    if (!row) return null;
    const profile = row as Record<string, any>;
    return {
        ...profile,
        skip_motivation: JSON.parse(profile.skip_motivation || '[]'),
        escape_rush_accept: Boolean(profile.escape_rush_accept),
        has_completed_onboarding: Boolean(profile.has_completed_onboarding),
    } as UserProfile;
}

export function updateProfile(data: Partial<UserProfile>): void {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return;

    const jsonFields = ['skip_motivation'];
    const boolFields = ['escape_rush_accept', 'has_completed_onboarding'];

    const columns = entries.map(([k]) => k);
    const values = entries.map(([k, v]) => {
        if (jsonFields.includes(k) && Array.isArray(v)) return JSON.stringify(v);
        if (boolFields.includes(k)) return v ? 1 : 0;
        return v;
    });
    const placeholders = columns.map(() => '?');

    const existing = db.prepare('SELECT id FROM user_profile WHERE id = ?').get(PROFILE_ID);
    if (!existing) {
        db.prepare(
            `INSERT INTO user_profile (id, ${columns.join(', ')}) VALUES (${PROFILE_ID}, ${placeholders.join(', ')})`
        ).run(PROFILE_ID, ...values);
    }
    db.prepare(
        `UPDATE user_profile SET ${columns.map(c => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...values.map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v), PROFILE_ID);
}

export function getConfig(): UserConfig | null {
    return db.prepare('SELECT * FROM user_config WHERE id = ?').get(CONFIG_ID) as UserConfig | null;
}

export function updateConfig(data: Partial<UserConfig>): void {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return;

    const columns = entries.map(([k]) => k);
    const values = entries.map(([_, v]) => v);
    const placeholders = columns.map(() => '?');

    const existing = db.prepare('SELECT id FROM user_config WHERE id = ?').get(CONFIG_ID);
    if (!existing) {
        db.prepare(
            `INSERT INTO user_config (id, ${columns.join(', ')}) VALUES (${CONFIG_ID}, ${placeholders.join(', ')})`
        ).run(CONFIG_ID, ...values);
    }
    db.prepare(
        `UPDATE user_config SET ${columns.map(c => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...values, CONFIG_ID);
}

export function ensureProfileExists(): UserProfile {
    const profile = getProfile();
    if (!profile) {
        db.prepare('INSERT INTO user_profile (id) VALUES (?)').run(PROFILE_ID);
    }
    return getProfile()!;
}

export function ensureConfigExists(): UserConfig {
    const config = getConfig();
    if (!config) {
        db.prepare('INSERT INTO user_config (id) VALUES (?)').run(CONFIG_ID);
    }
    return getConfig()!;
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 4: Sessions DAO

- [ ] **Step 1: 创建 `src/db/sessions.ts`**

```typescript
import { db } from './index';
import type { PlanSession, PlanAction } from '@/types';

export function getLatestSession(): { session: PlanSession; actions: PlanAction[] } | null {
    const session = db.prepare(
        "SELECT * FROM plan_session ORDER BY created_at DESC LIMIT 1"
    ).get() as PlanSession | undefined;
    if (!session) return null;

    const actions = db.prepare(
        `SELECT pa.* FROM plan_action pa
         JOIN course_schedule cs ON pa.schedule_id = cs.id
         ORDER BY cs.day_of_week, cs.period_slot`
    ).all() as PlanAction[];

    return { session, actions };
}

export function createSession(data: { plan_start_date: string; plan_end_date: string }): number {
    const result = db.prepare(
        'INSERT INTO plan_session (plan_start_date, plan_end_date, status) VALUES (?, ?, "draft")'
    ).run(data.plan_start_date, data.plan_end_date);
    return result.lastInsertRowid as number;
}

export function rejectLatestSession(): void {
    db.prepare(
        `UPDATE plan_session SET status = 'rejected'
         WHERE id = (SELECT id FROM plan_session ORDER BY created_at DESC LIMIT 1)`
    ).run();
}

export function acceptSession(id: number): void {
    db.prepare("UPDATE plan_session SET status = 'accepted' WHERE id = ?").run(id);
}

export function insertAction(data: Omit<PlanAction, 'id'>): number {
    const result = db.prepare(
        'INSERT INTO plan_action (session_id, schedule_id, action, reason) VALUES (?, ?, ?, ?)'
    ).run(data.session_id, data.schedule_id, data.action, data.reason);
    return result.lastInsertRowid as number;
}

export function getActionsBySession(sessionId: number): PlanAction[] {
    return db.prepare(
        'SELECT * FROM plan_action WHERE session_id = ?'
    ).all(sessionId) as PlanAction[];
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 5: Feedback DAO

- [ ] **Step 1: 创建 `src/db/feedback.ts`**

```typescript
import { db } from './index';
import type { ImmediateFeedback, WeeklyFeedback } from '@/types';

export function insertImmediateFeedback(data: Omit<ImmediateFeedback, 'id' | 'created_at'>): number {
    const result = db.prepare(
        'INSERT INTO immediate_feedback (session_id, decision, adjustment_notes) VALUES (?, ?, ?)'
    ).run(data.session_id, data.decision, data.adjustment_notes);
    return result.lastInsertRowid as number;
}

export function insertWeeklyFeedback(data: Omit<WeeklyFeedback, 'id' | 'created_at'>): number {
    const result = db.prepare(
        'INSERT INTO weekly_feedback (session_id, rating, was_caught, caught_courses, actual_events, memory_updates, comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
        data.session_id,
        data.rating,
        data.was_caught ? 1 : 0,
        data.caught_courses ? JSON.stringify(data.caught_courses) : null,
        data.actual_events ? JSON.stringify(data.actual_events) : null,
        data.memory_updates,
        data.comment
    );
    return result.lastInsertRowid as number;
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 6: Memory DAO

- [ ] **Step 1: 创建 `src/db/memory.ts`**

```typescript
import { db } from './index';

export function generateCourseSnapshot(courseId: number): string {
    const course = db.prepare('SELECT * FROM course WHERE id = ?').get(courseId) as Record<string, any>;
    if (!course) throw new Error(`Course ${courseId} not found`);

    const schedules = db.prepare(
        'SELECT weeks, day_of_week, period_slot FROM course_schedule WHERE course_id = ?'
    ).all(courseId);

    const snapshot = {
        course_id: course.id,
        name: course.name,
        teacher_name: course.teacher_name,
        location: course.location,
        course_type: course.course_type,
        study_mode: course.study_mode,
        teacher_attitude: course.teacher_attitude,
        escape_difficulty: course.escape_difficulty,
        rollcall_methods: JSON.parse(course.rollcall_methods || '[]'),
        catch_tolerance: course.catch_tolerance_per_class,
        max_catch_limit: course.max_catch_limit,
        current_caught_count: course.current_caught_count,
        rollcall_history: JSON.parse(course.rollcall_history || '[]'),
        exam_weeks: course.exam_weeks ? JSON.parse(course.exam_weeks) : null,
        notes: course.notes,
        schedules: schedules.map((s: any) => ({
            weeks: JSON.parse(s.weeks),
            day: s.day_of_week,
            period: s.period_slot,
        })),
    };
    return JSON.stringify(snapshot);
}

export function getAllCourseSnapshots(): { courseId: number; snapshot: string }[] {
    const courses = db.prepare('SELECT id FROM course ORDER BY id').all() as { id: number }[];
    return courses.map(course => ({
        courseId: course.id,
        snapshot: generateCourseSnapshot(course.id),
    }));
}

export function updateCourseMemory(courseId: number): void {
    const snapshot = generateCourseSnapshot(courseId);
    const existing = db.prepare('SELECT id FROM course_memory WHERE course_id = ?').get(courseId);

    if (existing) {
        db.prepare(
            "UPDATE course_memory SET snapshot_data = ?, last_updated = datetime('now') WHERE course_id = ?"
        ).run(snapshot, courseId);
    } else {
        db.prepare(
            'INSERT INTO course_memory (course_id, snapshot_data) VALUES (?, ?)'
        ).run(courseId, snapshot);
    }
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 7: 验证 Session

- [ ] **Step 1: LSP 诊断** 对所有 7 个文件运行，确保零 error。
- [ ] **Step 2: 文件结构确认**

```
src/
├── types/
│   └── index.ts
└── db/
    ├── schema.sql
    ├── index.ts
    ├── init.ts
    ├── courses.ts
    ├── profile.ts
    ├── sessions.ts
    ├── feedback.ts
    └── memory.ts
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: 类型定义 + DAO 层完整实现"
```

---

> **下一 Session:** Session 03 — LLM 客户端 + Parser Agent + `/api/parse-image`
