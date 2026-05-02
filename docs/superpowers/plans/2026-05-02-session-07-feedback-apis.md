# Session 07 — 反馈闭环 API（immediate + weekly）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成两个反馈 API：即时方案评价和周后实践反馈。这是后端开发的最后一个 Session，完成后 API 层全部完成。

**Architecture:** 两个独立的路由文件。immediate 处理方案接受/打回（打回触发重生成），weekly 处理周后回顾（更新记忆 + 自动触发生成新方案）。

**Tech Stack:** Next.js App Router API Routes

**Source docs:**
- `dev-doc.md` Section 五(5.9, 5.10)
- `design-spec.md` Section 三(接口8-9)

**前置依赖:** Session 06 (orchestrator, sessions DAO, feedback DAO)

---

## File Map

| 文件 | 操作 | HTTP 方法 |
|------|------|-----------|
| `src/app/api/feedback/immediate/route.ts` | 创建 | POST |
| `src/app/api/feedback/weekly/route.ts` | 创建 | POST |

---

### Task 1: 即时反馈 API

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/app/api/feedback/immediate src/app/api/feedback/weekly
```

- [ ] **Step 2: 创建 `src/app/api/feedback/immediate/route.ts`**

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbFeedback from '@/db/feedback';
import * as dbSessions from '@/db/sessions';
import * as dbMemory from '@/db/memory';
import * as dbProfile from '@/db/profile';
import { generateSession } from '@/agents/orchestrator';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    const body = await request.json();

    dbFeedback.insertImmediateFeedback({
        session_id: body.session_id,
        decision: body.decision,
        adjustment_notes: body.adjustment_notes || null,
    });

    if (body.decision === 'rejected') {
        // 更新快照 + 重新生成
        const allSnapshots = dbMemory.getAllCourseSnapshots();
        for (const s of allSnapshots) {
            dbMemory.updateCourseMemory(s.courseId);
        }

        const result = await generateSession({
            adjustment_notes: body.adjustment_notes,
        });

        return NextResponse.json({
            success: true,
            new_session_id: result.session_id,
            new_actions: result.actions,
        });
    }

    if (body.decision === 'accepted') {
        dbSessions.acceptSession(body.session_id);
        dbProfile.updateProfile({ has_completed_onboarding: true });
    }

    return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: LSP 诊断** — 零 error。

---

### Task 2: 周后反馈 API

- [ ] **Step 1: 创建 `src/app/api/feedback/weekly/route.ts`**

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbFeedback from '@/db/feedback';
import * as dbMemory from '@/db/memory';
import * as dbCourses from '@/db/courses';
import { generateSession } from '@/agents/orchestrator';

ensureDatabaseReady();

export async function POST(request: NextRequest) {
    const body = await request.json();

    // 如果 was_caught=true，更新被抓课程的 count
    if (body.was_caught && body.caught_courses?.length > 0) {
        for (const courseId of body.caught_courses) {
            const course = dbCourses.getCourseById(courseId);
            if (course) {
                dbCourses.updateCourse(courseId, {
                    current_caught_count: course.course.current_caught_count + 1,
                });
            }
        }
    }

    // 更新所有记忆快照
    const allSnapshots = dbMemory.getAllCourseSnapshots();
    for (const s of allSnapshots) {
        dbMemory.updateCourseMemory(s.courseId);
    }

    // 记录周后反馈
    dbFeedback.insertWeeklyFeedback({
        session_id: body.session_id,
        rating: body.rating || null,
        was_caught: body.was_caught || false,
        caught_courses: body.caught_courses ? JSON.stringify(body.caught_courses) : null,
        actual_events: body.actual_events ? JSON.stringify(body.actual_events) : null,
        memory_updates: body.memory_updates || null,
        comment: body.comment || null,
    });

    // 自动触发下周方案
    try {
        const result = await generateSession({});
        return NextResponse.json({
            success: true,
            new_session_id: result.session_id,
            new_actions: result.actions,
        });
    } catch (e) {
        return NextResponse.json({
            success: true,
            message: '反馈已记录，方案生成失败: ' + (e as Error).message,
        });
    }
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 3: 验证 Session + 后端验收

- [ ] **Step 1: LSP 诊断** 所有反馈相关文件零 error。
- [ ] **Step 2: API 路由完整清单确认**

```
src/app/api/
├── health/route.ts          ✅
├── init/route.ts            ✅
├── profile/route.ts         ✅
├── config/route.ts          ✅
├── parse-image/route.ts     ✅
├── courses/route.ts         ✅
├── courses/[id]/route.ts    ✅
├── session/route.ts         ✅
├── session/latest/route.ts  ✅
├── feedback/immediate/route.ts ✅
└── feedback/weekly/route.ts    ✅
```

- [ ] **Step 3: `npm run dev` 验证** — 启动无报错。
- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 反馈闭环 API 完成（immediate + weekly）— 后端全部完成"
```

---

> **后端部分至此全部完成！**
> **下一 Session:** Session 08 — 前端首页 + Onboarding Step 1（课表导入）
