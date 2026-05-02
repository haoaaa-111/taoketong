# Session 06 — Supervisor Agent + Orchestrator + 方案 API

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Supervisor Agent（排课方案生成）、Orchestrator 编排逻辑和方案生成/查询 API。

**Architecture:** Supervisor 是核心决策 Agent，Orchestrator 负责串联 Memory → Modeler(×N) → Supervisor 的完整流程。两个 API 路由：POST /api/session（生成）和 GET /api/session/latest（查询）。

**Tech Stack:** openai (via llm.ts), better-sqlite3 (via DAO)

**Source docs:**
- `dev-doc.md` Section 四(4.1 supervisor.md, 4.2 supervisor.ts, 4.3 orchestrator.ts), 五(5.7, 5.8)
- `design-spec.md` Section 4.4, 4.5, 三(接口6-7)

**前置依赖:** Session 04 (DAO), Session 05 (memory.ts, modeler.ts)

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/agents/prompts/supervisor.md` | 创建 | Supervisor Agent prompt |
| `src/agents/supervisor.ts` | 创建 | generatePlan 函数 |
| `src/agents/orchestrator.ts` | 创建 | generateSession 编排函数 |
| `src/app/api/session/route.ts` | 创建 | POST — 方案生成 |
| `src/app/api/session/latest/route.ts` | 创建 | GET — 最新方案查询 |

---

### Task 1: Supervisor Agent

- [ ] **Step 1: 创建 `src/agents/prompts/supervisor.md`**

```markdown
你是一个排课方案生成器。你的设计风格是大胆激进，不怕被抓。

## 设计哲学
方案应该大胆！不要害怕被抓。用户自己选择了逃课这条路，你不需要保护他们太多。仅在以下情况保守：
- 高风险的专业课 AND 用户选择了"上课学习"模式
- 用户明确说某门课"绝对不能逃"

## 任务
根据以下信息为每节课指定行动标签：上课、逃课、或签退。

## 输入
- 用户画像：目标逃课频率、是否能上课后溜走、代课预算等
- 所有课程的完整信息快照
- 每门课程的风险评估结果
- 当前周次信息
- 用户的调整建议或约束

## 行动标签
- 上课：去上这节课（本人去或找人代替由用户自行决定）
- 逃课：不去了
- 签退：去签个到然后开溜（仅当用户表示能抗压上课后溜走时可安排）

## 自检规则（必须遵守）
1. 本周安排的逃课数不超过用户的目标逃课数（可以适当放宽，不要太保守）
2. 仅"高风险专业课 + study_mode=上课学习"时保守，建议上课
3. "签退"仅在 escape_rush_accept=true 时才可能出现
4. 如果本周是某门课的期考前后一周，建议多到课获取考试信息
5. 如果本周是某门课的本学期第一次课，建议到课获取课程要求/点名规矩
6. 学期第一周的课建议多到课
7. 尊重用户 constraints（must_attend 的课程必须安排上课）

## 输出格式

```json
{
    "actions": [
        {
            "schedule_id": 1,
            "action": "逃课",
            "reason": "水课，低风险，老师懒得管"
        },
        {
            "schedule_id": 2,
            "action": "上课",
            "reason": "专业课，本周是第一周课"
        }
    ]
}
```

- 只输出 JSON，不要有其他文字
- reason 简洁即可，正常风格
```

- [ ] **Step 2: 创建 `src/agents/supervisor.ts`**

```typescript
import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync(
    require.resolve('./prompts/supervisor.md'),
    'utf-8'
);

export async function generatePlan(
    promptContext: string
): Promise<{ actions: { schedule_id: number; action: string; reason: string }[] }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: promptContext,
        temperature: 0.8,
    });
    return result;
}
```

- [ ] **Step 3: LSP 诊断** — 零 error。

---

### Task 2: Orchestrator

- [ ] **Step 1: 创建 `src/agents/orchestrator.ts`**

```typescript
import * as dbMemory from '@/db/memory';
import * as dbSessions from '@/db/sessions';
import * as dbProfile from '@/db/profile';
import { modelCourseRisk } from './modeler';
import { generatePlan } from './supervisor';
import type { PlanAction } from '@/types';
import { addDays, formatISO } from 'date-fns';

export interface SessionInput {
    adjustment_notes?: string;
    constraints?: {
        skip_course_ids: number[];
        must_attend_ids: number[];
    };
}

export async function generateSession(
    input: SessionInput
): Promise<{ session_id: number; actions: PlanAction[] }> {
    // 1. 更新所有课程记忆
    const courses = dbMemory.getAllCourseSnapshots();
    for (const c of courses) {
        dbMemory.updateCourseMemory(c.courseId);
    }

    // 2. 获取用户画像
    const profile = dbProfile.ensureProfileExists();
    const config = dbProfile.ensureConfigExists();

    // 3. 对每门课程进行风险建模
    const riskResults: Record<number, { risk_level: string; risk_reason: string; next_caught_probability: number }> = {};
    for (const c of courses) {
        const risk = await modelCourseRisk(c.snapshot);
        riskResults[c.courseId] = risk;
    }

    // 4. 拼接 Supervisor 的 prompt 上下文
    let prompt = `[用户画像]\n${JSON.stringify(profile, null, 2)}\n\n`;
    prompt += `[学期信息]\n当前第${config.current_week}周，周${config.current_day_of_week}\n`;
    prompt += `学期：${config.semester_start_date} 至 ${config.semester_end_date}\n\n`;

    for (const c of courses) {
        prompt += `[课程记忆快照 - ${JSON.parse(c.snapshot).name}]\n`;
        prompt += `${c.snapshot}\n\n`;
        if (riskResults[c.courseId]) {
            prompt += `风险评估：${JSON.stringify(riskResults[c.courseId])}\n\n`;
        }
    }

    if (input.adjustment_notes) {
        prompt += `[调整建议]\n${input.adjustment_notes}\n\n`;
    }
    if (input.constraints) {
        prompt += `[约束]\n${JSON.stringify(input.constraints)}\n\n`;
    }

    prompt += '[生成指令]\n以上课程信息，请生成方案。';

    // 5. Supervisor 生成方案（最多重试 2 次）
    let result: { actions: { schedule_id: number; action: string; reason: string }[] } | undefined;
    let retries = 0;
    while (retries <= 2) {
        try {
            result = await generatePlan(prompt);
            if (result.actions && result.actions.length > 0) break;
        } catch (e) {
            // retry
        }
        retries++;
    }

    if (!result || !result.actions || result.actions.length === 0) {
        throw new Error('方案生成失败');
    }

    // 6. 旧方案标记为 rejected
    const latest = dbSessions.getLatestSession();
    if (latest && latest.session.status === 'draft') {
        dbSessions.rejectLatestSession();
    }

    // 7. 创建新方案
    const startDate = new Date();
    const endDate = addDays(startDate, (profile.plan_weeks || 1) * 7);

    const sessionId = dbSessions.createSession({
        plan_start_date: formatISO(startDate, { representation: 'date' }),
        plan_end_date: formatISO(endDate, { representation: 'date' }),
    });

    // 8. 保存动作
    const actions: PlanAction[] = result.actions.map(a => {
        const id = dbSessions.insertAction({
            session_id: sessionId,
            schedule_id: a.schedule_id,
            action: a.action,
            reason: a.reason,
        });
        return { id, session_id: sessionId, schedule_id: a.schedule_id, action: a.action, reason: a.reason };
    });

    return { session_id: sessionId, actions };
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 3: 方案 API

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/app/api/session/latest
```

- [ ] **Step 2: 创建 `src/app/api/session/route.ts`**

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import { generateSession } from '@/agents/orchestrator';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await generateSession({
            adjustment_notes: body.adjustment_notes,
            constraints: body.constraints,
        });
        return NextResponse.json({
            success: true,
            session_id: result.session_id,
            actions: result.actions,
        });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: (e as Error).message },
            { status: 500 }
        );
    }
}
```

- [ ] **Step 3: 创建 `src/app/api/session/latest/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbSessions from '@/db/sessions';

ensureDatabaseReady();

export async function GET() {
    const latest = dbSessions.getLatestSession();
    if (!latest) return NextResponse.json({ error: 'No sessions' }, { status: 404 });
    return NextResponse.json({ session: latest.session, actions: latest.actions });
}
```

- [ ] **Step 4: LSP 诊断** — 零 error。

---

### Task 4: 验证 Session

- [ ] **Step 1: LSP 诊断** 所有新文件零 error。
- [ ] **Step 2: 文件结构确认**

```
src/agents/
├── parser.ts
├── memory.ts
├── modeler.ts
├── supervisor.ts      (new)
├── orchestrator.ts    (new)
└── prompts/
    ├── parser.md
    ├── memory.md
    ├── modeler.md
    └── supervisor.md  (new)

src/app/api/
├── session/
│   ├── route.ts       (new)
│   └── latest/
│       └── route.ts   (new)
└── ...
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: Supervisor Agent + Orchestrator + 方案 API"
```

---

> **下一 Session:** Session 07 — 反馈 API（immediate + weekly）
