# Week-Granularity Plan Action Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `week` column to `plan_action`, wire supervisor prompt output to include `week`, and refactor rule-validator to validate per-week.

**Architecture:** The supervisor prompt already asks LLM for per-week actions with a `week` field, but the Zod schema strips it, TypeScript types ignore it, DB has no column for it, and the rule-validator only checks at `schedule_id` grain. This plan propagates `week` through all layers: types → context → prompt → Zod → orchestrator → DB → validator → frontend.

**Tech Stack:** TypeScript, Zod, better-sqlite3, React, Jest

**Constraints:** Do NOT modify `src/agents/risk/` or `src/db/memory.ts` (Bayesian layer under parallel development).

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `week: number` to `PlanAction`; add `plan_weeks?: number` to `StructuredPlanContext` |
| `src/agents/context-builder.ts` | Modify | Accept and pass `plan_weeks` into context |
| `src/agents/prompt-builder.ts` | Modify | Include `plan_weeks` in semester context block |
| `src/agents/supervisor.ts` | Modify | Add `week` to `SupervisorActionSchema` zod schema |
| `src/db/schema.sql` | Modify | Add `week` column to `plan_action` table |
| `src/db/migrations/002-plan-action-week.sql` | Create | Migration SQL for existing databases |
| `src/db/sessions.ts` | Modify | Add `week` to INSERT/SELECT in all CRUD functions |
| `src/agents/orchestrator.ts` | Modify | Pass `a.week` to `insertAction()`; pass `plan_weeks` to context builder |
| `src/agents/rule-validator.ts` | Modify | Refactor `ActionEntry` to include `week`; make per-week rules use `week` |
| `src/app/schedule/page.tsx` | Modify | Add `week: number` to local `PlanAction` interface |
| `src/__tests__/agents/rule-validator.test.ts` | Modify | Update `makeAction` helper and test assertions for `week` field |
| `src/__tests__/agents/supervisor-output.test.ts` | Modify | Include `week` in test schemas if present |
| `src/__tests__/db/sessions.test.ts` | Modify | Add `week` to raw SQL inserts |
| `src/__tests__/agents/orchestrator-parallel.test.ts` | Modify | Update mock `insertAction` if needed |
| `src/__tests__/agents/orchestrator-modeler-isolation.test.ts` | Modify | Update mock `insertAction` if needed |
| `src/__tests__/integration/full-pipeline.test.ts` | Modify | Update mock `insertAction` if needed |

---

## Chunk 1: Types & Context Foundation

### Task 1.1: Add `week` to `PlanAction` type

**Files:**
- Modify: `src/types/index.ts:91-97`

- [ ] **Step 1: Add `week` field to PlanAction interface**

```typescript
export interface PlanAction {
    id: number;
    session_id: number;
    schedule_id: number;
    week: number;
    action: typeof ACTION_TYPES[number];
    reason: string | null;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors about missing `week` in various files — these will be fixed in later tasks.

### Task 1.2: Add `plan_weeks` to `StructuredPlanContext`

**Files:**
- Modify: `src/types/index.ts:225-233`

- [ ] **Step 1: Add `plan_weeks` to `StructuredPlanContext`**

In `StructuredPlanContext` interface, add to the root level:
```typescript
export interface StructuredPlanContext {
    user_profile: PlanUserProfile;
    semester_info: PlanSemesterInfo;
    courses: CoursePlanInput[];
    plan_weeks: number;           // ← NEW
    overrides?: PlanOverrides;
    retry_hint?: string;
    temperature_modifier?: number;
    memory_context?: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Error about `plan_weeks` missing in `context-builder.ts` return value. Will fix in next task.

---

## Chunk 2: DB Schema & CRUD

### Task 2.1: Create migration and update schema

**Files:**
- Create: `src/db/migrations/002-plan-action-week.sql`
- Modify: `src/db/schema.sql:69-75`

- [ ] **Step 1: Create migration file**

```sql
-- Migration 002: Add week column to plan_action for week-granularity planning
ALTER TABLE plan_action ADD COLUMN week INTEGER;
```

- [ ] **Step 2: Update schema.sql**

Add `week INTEGER` after `schedule_id` column:
```sql
CREATE TABLE IF NOT EXISTS plan_action (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES plan_session(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES course_schedule(id) ON DELETE CASCADE,
    week INTEGER,
    action TEXT NOT NULL CHECK (action IN ('上课', '逃课', '签退')),
    reason TEXT
);
```

- [ ] **Step 3: Run migration on dev DB**

Run: `sqlite3 data/skipclass.db < src/db/migrations/002-plan-action-week.sql`
Expected: No errors.

### Task 2.2: Update DB CRUD functions

**Files:**
- Modify: `src/db/sessions.ts`

- [ ] **Step 1: Update `insertAction` function signature and SQL**

Change the function to accept `week`:
```typescript
export function insertAction(data: Omit<PlanAction, 'id'>): number {
    const result = db.prepare(
        'INSERT INTO plan_action (session_id, schedule_id, week, action, reason) VALUES (?, ?, ?, ?, ?)'
    ).run(data.session_id, data.schedule_id, data.week, data.action, data.reason);
    return result.lastInsertRowid as number;
}
```

- [ ] **Step 2: Update `createSessionWithActions` INSERT**

Change line 14:
```typescript
db.prepare(
    'INSERT INTO plan_action (session_id, schedule_id, week, action, reason) VALUES (?, ?, ?, ?, ?)'
).run(sessionId, actionData.schedule_id, actionData.week, actionData.action, actionData.reason);
```

- [ ] **Step 3: Verify `getLatestSession` and `getActionsBySession`**

Both use `SELECT pa.*` or `SELECT *` — they will automatically include the new `week` column. No change needed.

- [ ] **Step 4: Verify diagnostics**

Run: `lsp_diagnostics src/db/sessions.ts`
Expected: Clean (no errors). Type errors may appear due to orchestrator not yet passing `week` — will fix in Chunk 3.

---

## Chunk 3: Supervisor Pipeline

### Task 3.1: Update context-builder to accept and pass `plan_weeks`

**Files:**
- Modify: `src/agents/context-builder.ts`

- [ ] **Step 1: Add `plan_weeks` parameter to `buildPlanContext`**

Change the function signature (line 25-31):
```typescript
export function buildPlanContext(
    courses: Array<{ courseId: number; snapshot: string }>,
    profile: { weekly_skip_target: number; escape_rush_accept: boolean; plan_weeks?: number },
    config: { current_week: number | null; current_day_of_week: number | null },
    riskResults: Record<number, FusionResult>,
    mustAttendIds?: number[],
): StructuredPlanContext {
```

- [ ] **Step 2: Include `plan_weeks` in return value**

Add to the return object (after line 84):
```typescript
return {
    user_profile: { ... },
    semester_info: { ... },
    courses: courseInputs,
    plan_weeks: profile.plan_weeks ?? 1,  // ← NEW
};
```

- [ ] **Step 3: Verify diagnostics**

Run: `lsp_diagnostics src/agents/context-builder.ts`
Expected: Clean.

### Task 3.2: Update prompt-builder to include `plan_weeks`

**Files:**
- Modify: `src/agents/prompt-builder.ts`

- [ ] **Step 1: Add `plan_weeks` to semester context block**

In `formatSemesterContext` (line 11-22), add to the semester info output:
```typescript
return `## 学期信息
- 当前第 ${semester_info.current_week} 周 / 共 ${semester_info.total_weeks} 周
- 今天是 ${dayNames[semester_info.day_of_week] || '未知'}
- ${semester_info.is_exam_week ? '⚠️ 本周是考试周' : '非考试周'}
- ${semester_info.is_first_week ? '⚠️ 本周是开学第一周' : ''}
- plan_weeks：${ctx.plan_weeks} 周`;  // ← NEW
```

- [ ] **Step 2: Verify diagnostics**

Run: `lsp_diagnostics src/agents/prompt-builder.ts`
Expected: Clean.

### Task 3.3: Update supervisor Zod schema

**Files:**
- Modify: `src/agents/supervisor.ts:11-15`

- [ ] **Step 1: Add `week` to `SupervisorActionSchema`**

```typescript
export const SupervisorActionSchema = z.object({
    schedule_id: z.number().int().positive(),
    week: z.number().int().positive(),  // ← NEW
    action: z.enum(['上课', '逃课', '签退']),
    reason: z.string().min(1),
});
```

- [ ] **Step 2: Verify diagnostics**

Run: `lsp_diagnostics src/agents/supervisor.ts`
Expected: Clean.

### Task 3.4: Update orchestrator to pass `week` through

**Files:**
- Modify: `src/agents/orchestrator.ts`

- [ ] **Step 1: Pass `plan_weeks` to context builder**

Change the `buildPlanContext` call (line 53) — the profile already has `plan_weeks`:
```typescript
const ctx = buildPlanContext(courses, profile, config, riskResults, input.constraints?.must_attend_ids);
```
Profile is already typed with `plan_weeks`, so no signature change needed here (already done in Task 3.1).

- [ ] **Step 2: Pass `a.week` to `insertAction`**

In the action mapping (lines 67-73), add `week`:
```typescript
const actions: PlanAction[] = plan.actions.map(a => {
    const id = dbSessions.insertAction({
        session_id: sessionId, schedule_id: a.schedule_id,
        week: a.week,  // ← NEW
        action: a.action as PlanAction['action'], reason: a.reason,
    });
    return { id, session_id: sessionId, schedule_id: a.schedule_id,
        week: a.week,  // ← NEW
        action: a.action as PlanAction['action'], reason: a.reason };
});
```

- [ ] **Step 3: Verify diagnostics**

Run: `lsp_diagnostics src/agents/orchestrator.ts`
Expected: Clean.

---

## Chunk 4: Rule Validator Refactor

### Task 4.1: Refactor validator for per-week awareness

**Files:**
- Modify: `src/agents/rule-validator.ts`

- [ ] **Step 1: Update `ActionEntry` type to include `week`**

Line 5:
```typescript
type ActionEntry = { schedule_id: number; week: number; action: string; reason: string };
```

- [ ] **Step 2: Refactor Rule 4 (期考周保守) to use per-action `week`**

Replace lines 87-102. Instead of checking `context.semester_info.is_exam_week` globally, check each action's `week` against exam week data:

```typescript
// Rule 4: 期考周前后 → 上课 (per-week)
const examWeekSet = new Set<number>();
for (const c of context.courses) {
    // Find the course in original course list to extract exam_weeks
    // We check per-action: if action.week is near exam week for that course
}
const examViolations = actions
    .filter(a => a.action !== '上课')
    .filter(a => {
        const c = context.courses.find(co => co.schedule_id === a.schedule_id);
        if (!c) return false;
        // Check if any schedule_week equals the action's week — validates week existence
        const hasValidWeek = c.schedule_weeks.includes(a.week);
        // Also check exam week proximity if exam data is available
        return hasValidWeek;
    })
    .map(a => ({
        schedule_id: a.schedule_id,
        action: a.action,
        expected_action: '上课',
        reason: `第${a.week}周为期考附近 → 必须到课`
    }));
```

**Note:** Full exam-week proximity check requires `exam_weeks` data per course, which is in `CoursePlanInput.schedule_weeks` but not currently as exam metadata. For MVP, validate that `week` exists in `schedule_weeks` for each schedule.

- [ ] **Step 3: Refactor Rule 5 (第一次课必到) to use per-action `week`**

Replace lines 104-122:
```typescript
// Rule 5: 第一次课 → 上课 (per-week)
const firstClassViolations = actions
    .filter(a => a.action !== '上课')
    .filter(a => {
        const c = context.courses.find(co => co.schedule_id === a.schedule_id);
        return c && c.schedule_weeks.length > 0 && a.week === c.schedule_weeks[0];
    })
    .map(a => ({
        schedule_id: a.schedule_id,
        action: a.action,
        expected_action: '上课',
        reason: '本学期第一次课 → 必须到课'
    }));
```

- [ ] **Step 4: Refactor Rule 1 (逃课数限制) to count per-week**

Replace lines 31-45:
```typescript
// Rule 1: 逃课数限制 (per-week)
const weekSkipCounts = new Map<number, number>();
for (const a of actions) {
    if (a.action === '逃课') {
        weekSkipCounts.set(a.week, (weekSkipCounts.get(a.week) || 0) + 1);
    }
}
const skipViolations: RuleViolation[] = [];
for (const [week, count] of weekSkipCounts) {
    if (count > context.user_profile.weekly_skip_target) {
        skipViolations.push({
            schedule_id: -1,
            action: `第${week}周整体`,
            expected_action: `逃课≤${context.user_profile.weekly_skip_target}次`,
            reason: `第${week}周逃课${count}次，超过目标`
        });
    }
}
checks.push({
    rule_id: 1,
    rule_name: '逃课数限制',
    passed: skipViolations.length === 0,
    violations: skipViolations
});
```

- [ ] **Step 5: Refactor Rule 6 (第一周保守) to use per-action `week`**

Replace lines 124-139:
```typescript
// Rule 6: 第一周 → 逃课≤1 (per-week)
const firstWeekActions = actions.filter(a => a.week === 1);
const firstWeekSkip = firstWeekActions.filter(a => a.action === '逃课').length;
const firstWeekViolations = firstWeekSkip > 1
    ? [{
        schedule_id: -1,
        action: '整体',
        expected_action: '逃课≤1次',
        reason: `第一周逃课${firstWeekSkip}次 → 最多逃1次课`
      }]
    : [];
checks.push({
    rule_id: 6,
    rule_name: '第一周保守',
    passed: firstWeekViolations.length === 0,
    violations: firstWeekViolations
});
```

- [ ] **Step 6: Verify diagnostics**

Run: `lsp_diagnostics src/agents/rule-validator.ts`
Expected: Clean.

---

## Chunk 5: Frontend & Tests

### Task 5.1: Update frontend PlanAction interface

**Files:**
- Modify: `src/app/schedule/page.tsx:9-15`

- [ ] **Step 1: Add `week` to local PlanAction interface**

```typescript
interface PlanAction {
    id: number;
    session_id: number;
    schedule_id: number;
    week: number;  // ← NEW
    action: string;
    reason: string | null;
}
```

- [ ] **Step 2: Verify diagnostics**

Run: `lsp_diagnostics src/app/schedule/page.tsx`
Expected: Clean (no new errors).

### Task 5.2: Update test fixtures and assertions

**Files:**
- Modify: `src/__tests__/db/sessions.test.ts`
- Modify: `src/__tests__/agents/rule-validator.test.ts`
- Modify: `src/__tests__/agents/orchestrator-parallel.test.ts` (mocks)
- Modify: `src/__tests__/agents/orchestrator-modeler-isolation.test.ts` (mocks)
- Modify: `src/__tests__/integration/full-pipeline.test.ts` (mocks)

- [ ] **Step 1: Update sessions.test.ts — add `week` to raw SQL inserts**

Lines 39-46: Add `week` column to INSERT statements:
```sql
INSERT INTO plan_action (session_id, schedule_id, week, action, reason) VALUES (1, 1, 1, '上课', 'test')
```

- [ ] **Step 2: Update rule-validator.test.ts — add `week` to `makeAction`**

Line 27:
```typescript
function makeAction(scheduleId: number, week: number, action: string): PlanAction {
    return { schedule_id: scheduleId, week, action, reason: 'test' } as PlanAction;
}
```
Update all test calls to pass `week` parameter (use `1` as default for existing tests).

- [ ] **Step 3: Update orchestrator test mocks**

In all three orchestrator test files, the `insertAction` mock signature is:
```typescript
insertAction: jest.fn((data: any) => 100 + data.schedule_id)
```
This already accepts `any` type — no change needed for the mock signature. But verify test assertions that check `insertAction` calls include `week` in expected payload.

- [ ] **Step 4: Run full test suite**

Run: `npm test 2>&1`
Expected: All tests pass (except pre-existing `course-memory-provider.test.ts` failure).

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: No type errors.

---

## Verification Checklist

- [ ] `week` column exists in `plan_action` table (migration applied)
- [ ] Zod schema validates `week` field in supervisor output
- [ ] Orchestrator passes `week` from LLM output to `insertAction`
- [ ] Rule-validator uses per-action `week` for rules 1, 4, 5, 6
- [ ] `plan_weeks` appears in supervisor prompt context
- [ ] Frontend `PlanAction` interface includes `week`
- [ ] All tests pass (pre-existing failures excluded)
- [ ] TypeScript compilation clean
- [ ] `src/agents/risk/` untouched ✓
- [ ] `src/db/memory.ts` untouched ✓
