# Session 04 — 基础设施 API（health/init/profile/config/courses）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成所有基础设施 API 路由：health, init, profile, config, courses CRUD。

**Architecture:** 5 个 API 路由文件，均在 `src/app/api/` 下。每个路由开头调用 `ensureDatabaseReady()`。

**Tech Stack:** Next.js App Router API Routes

**Source docs:**
- `dev-doc.md` Section 五(5.1-5.5)
- `design-spec.md` Section 三(接口0-4)

**前置依赖:** Session 02 (DAO), Session 03 (ensureDatabaseReady)

---

## File Map

| 文件 | 操作 | HTTP 方法 |
|------|------|-----------|
| `src/app/api/health/route.ts` | 创建 | GET |
| `src/app/api/init/route.ts` | 创建 | GET |
| `src/app/api/profile/route.ts` | 创建 | GET / PUT |
| `src/app/api/config/route.ts` | 创建 | GET / PUT |
| `src/app/api/courses/route.ts` | 创建 | GET |
| `src/app/api/courses/[id]/route.ts` | 创建 | GET / PUT / DELETE |

---

### Task 1: Health + Init API

- [ ] **Step 1: 创建 `src/app/api/health/route.ts`**

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ status: 'ok' });
}
```

- [ ] **Step 2: 创建目录 + `src/app/api/init/route.ts`**

```bash
mkdir -p src/app/api/init src/app/api/health
```

```typescript
import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbSessions from '@/db/sessions';

ensureDatabaseReady();

export async function GET() {
    const latest = dbSessions.getLatestSession();
    if (latest && (latest.session.status === 'draft' || latest.session.status === 'accepted')) {
        return NextResponse.json({
            has_data: true,
            last_session: latest.session,
            last_actions: latest.actions,
        });
    }
    return NextResponse.json({ has_data: false });
}
```

---

### Task 2: Profile API

- [ ] **Step 1: 创建 `src/app/api/profile/route.ts`**

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbProfile from '@/db/profile';

ensureDatabaseReady();

export async function GET() {
    const profile = dbProfile.ensureProfileExists();
    return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    dbProfile.updateProfile(body);
    const profile = dbProfile.getProfile()!;

    const config = dbProfile.getConfig();
    let truncated = false;
    if (config?.semester_end_date && profile.plan_start_date) {
        const endDate = new Date(profile.plan_start_date);
        endDate.setDate(endDate.getDate() + profile.plan_weeks * 7);
        const semEnd = new Date(config.semester_end_date);
        if (endDate > semEnd) truncated = true;
    }

    return NextResponse.json({ success: true, data: profile, truncated });
}
```

---

### Task 3: Config API

- [ ] **Step 1: 创建 `src/app/api/config/route.ts`**

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbProfile from '@/db/profile';

ensureDatabaseReady();

export async function GET() {
    const config = dbProfile.ensureConfigExists();
    // 注意：config 不含敏感字段
    return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    dbProfile.updateConfig(body);
    return NextResponse.json({ success: true });
}
```

---

### Task 4: Courses API（列表 + 详情 + 更新 + 删除）

- [ ] **Step 1: 创建 `src/app/api/courses/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbCourses from '@/db/courses';

ensureDatabaseReady();

export async function GET() {
    const data = dbCourses.getAllCoursesWithSchedules();
    return NextResponse.json({ courses: data });
}
```

- [ ] **Step 2: 创建 `src/app/api/courses/[id]/route.ts`**

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import * as dbCourses from '@/db/courses';
import * as dbMemory from '@/db/memory';

ensureDatabaseReady();

export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const data = dbCourses.getCourseById(Number(params.id));
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ course: data });
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const body = await request.json();
    dbCourses.updateCourse(Number(params.id), body);
    dbMemory.updateCourseMemory(Number(params.id));
    return NextResponse.json({
        success: true,
        data: dbCourses.getCourseById(Number(params.id)),
    });
}

export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    dbCourses.deleteCourse(Number(params.id));
    return NextResponse.json({ success: true });
}
```

---

### Task 5: 验证 Session

- [ ] **Step 1: LSP 诊断** 所有 5 个路由文件零 error。
- [ ] **Step 2: 文件结构确认**

```
src/app/api/
├── health/route.ts
├── init/route.ts
├── profile/route.ts
├── config/route.ts
├── courses/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
└── parse-image/route.ts  (from Session 03)
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: 基础设施 API 全部实现"
```

---

> **下一 Session:** Session 05 — Onboarding Step 1（课表导入 UI）
