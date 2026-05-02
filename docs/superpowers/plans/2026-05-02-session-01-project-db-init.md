# Session 01 — 项目初始化 + 数据库基础层

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Next.js 项目初始化、SQLite 数据库 schema、连接模块和初始化钩子。

**Architecture:** 纯后端基础设施，不涉及 Agent 或前端。建立 `src/db/` 下的 schema SQL、数据库连接和初始化钩子。

**Tech Stack:** Next.js 15, TypeScript strict, better-sqlite3, sql-template-tag

**Source docs:**
- `dev-doc.md` Section 〇, 一(1.1, 1.2, 1.4)
- `design-spec.md` 第一节

**前置条件：**
- Node.js 20+ 已安装
- 工作目录：`/home/zch/tkt_1`

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `package.json` | 创建 | 项目依赖声明 |
| `tsconfig.json` | 创建 | TypeScript strict 配置 |
| `next.config.ts` | 创建 | Next.js 配置 |
| `.env.local` | 创建 | 环境变量（用户手动填写） |
| `.env.example` | 创建 | 环境变量模板 |
| `src/db/schema.sql` | 创建 | 完整数据库 schema |
| `src/db/index.ts` | 创建 | 数据库连接 + 初始化 |
| `src/db/init.ts` | 创建 | 应用启动钩子 |

---

### Task 1: 初始化 Next.js 项目

- [ ] **Step 1: 创建项目**

```bash
npx create-next-app@latest skip-class --typescript --tailwind --app --src-dir --eslint
```

进入项目目录：
```bash
cd skip-class
```

- [ ] **Step 2: 安装运行时依赖**

```bash
npm install better-sqlite3 openai sql-template-tag date-fns
npm install -D @types/better-sqlite3
```

- [ ] **Step 3: 确认 tsconfig.json 中 `strict: true`**

检查 `tsconfig.json`，确保 `"strict": true` 存在。

- [ ] **Step 4: 创建 .env.example**

```env
# LLM API 配置
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o

# 开发用 Langfuse（发布前移除）
# LANGFUSE_HOST=http://localhost:3000
# LANGFUSE_PUBLIC_KEY=pk-lf-xxx
# LANGFUSE_SECRET_KEY=sk-lf-xxx
```

- [ ] **Step 5: 创建 .env.local（模板值）**

```env
LLM_API_KEY=sk-placeholder
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

- [ ] **Step 6: 验证项目可启动**

```bash
npm run dev
```

确认无报错后 `Ctrl+C` 停止。

---

### Task 2: 数据库 Schema

- [ ] **Step 1: 创建数据目录**

```bash
mkdir -p data
```

- [ ] **Step 2: 创建 `src/db/schema.sql`**

```sql
-- UserConfig (仅一条记录)
CREATE TABLE IF NOT EXISTS user_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_start_date TEXT,
    semester_end_date TEXT,
    current_week INTEGER,
    current_day_of_week INTEGER CHECK (current_day_of_week BETWEEN 1 AND 7),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- UserProfile (仅一条记录)
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skip_motivation TEXT DEFAULT '[]',
    plan_start_date TEXT,
    plan_weeks INTEGER DEFAULT 1,
    weekly_skip_habit INTEGER DEFAULT 0,
    weekly_skip_target INTEGER DEFAULT 0,
    sub_cost_max INTEGER DEFAULT 30,
    escape_rush_accept INTEGER DEFAULT 0,
    commute_cost_minutes INTEGER DEFAULT 10,
    has_completed_onboarding INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Course
CREATE TABLE IF NOT EXISTS course (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    teacher_name TEXT,
    credits INTEGER,
    course_type TEXT DEFAULT '不确定',
    study_mode TEXT DEFAULT '自学',
    teacher_attitude TEXT DEFAULT '不确定',
    escape_difficulty TEXT,
    rollcall_methods TEXT DEFAULT '[]',
    catch_tolerance_per_class INTEGER DEFAULT 5,
    max_catch_limit INTEGER DEFAULT 3,
    current_caught_count INTEGER DEFAULT 0,
    rollcall_history TEXT DEFAULT '[]',
    exam_weeks TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- CourseSchedule
CREATE TABLE IF NOT EXISTS course_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    weeks TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    period_slot TEXT NOT NULL
);

-- PlanSession
CREATE TABLE IF NOT EXISTS plan_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_start_date TEXT NOT NULL,
    plan_end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'rejected')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- PlanAction
CREATE TABLE IF NOT EXISTS plan_action (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES plan_session(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES course_schedule(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('上课', '逃课', '签退')),
    reason TEXT
);

-- ImmediateFeedback
CREATE TABLE IF NOT EXISTS immediate_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES plan_session(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected')),
    adjustment_notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- WeeklyFeedback
CREATE TABLE IF NOT EXISTS weekly_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES plan_session(id) ON DELETE CASCADE,
    rating INTEGER,
    was_caught INTEGER DEFAULT 0,
    caught_courses TEXT,
    actual_events TEXT,
    memory_updates TEXT,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- CourseMemory
CREATE TABLE IF NOT EXISTS course_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    snapshot_data TEXT NOT NULL,
    last_updated TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_schedule_course ON course_schedule(course_id);
CREATE INDEX IF NOT EXISTS idx_action_session ON plan_action(session_id);
CREATE INDEX IF NOT EXISTS idx_action_schedule ON plan_action(schedule_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON immediate_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_weekly_feedback_session ON weekly_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_memory_course ON course_memory(course_id);
```

- [ ] **Step 3: 验证 SQL 语法**

```bash
sqlite3 :memory: < src/db/schema.sql && echo "SQL OK"
```

---

### Task 3: 数据库连接模块

- [ ] **Step 1: 创建 `src/db/index.ts`**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'skipclass.db');

// 确保数据目录存在
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
    const schema = fs.readFileSync(
        path.join(process.cwd(), 'src', 'db', 'schema.sql'),
        'utf-8'
    );
    db.exec(schema);
}

export { db };
```

- [ ] **Step 2: 运行 LSP 检查**

确认无 TypeScript 报错。

---

### Task 4: 初始化钩子

- [ ] **Step 1: 创建 `src/db/init.ts`**

```typescript
import { initDatabase } from './index';

// 在应用启动时调用一次
let initialized = false;

export function ensureDatabaseReady(): void {
    if (initialized) return;
    initDatabase();
    initialized = true;
}
```

- [ ] **Step 2: 修改 `src/app/layout.tsx`**

在 `layout.tsx` 中引入并调用 `ensureDatabaseReady()`：

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { ensureDatabaseReady } from '@/db/init';

ensureDatabaseReady();

export const metadata: Metadata = {
    title: '逃课通',
    description: 'AI 逃课规划方案',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN" className="dark">
            <body className="min-h-screen bg-gray-950 text-gray-100">
                {children}
            </body>
        </html>
    );
}
```

- [ ] **Step 3: 更新 `src/app/globals.css`**（基础主题）

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
}

.card {
    @apply bg-gray-800/50 border border-gray-700/50 rounded-xl p-6;
}

.btn {
    @apply px-4 py-2.5 rounded-lg font-medium transition-all;
}
.btn-primary {
    @apply bg-blue-600 hover:bg-blue-500 text-white;
}
.btn-secondary {
    @apply bg-gray-700 hover:bg-gray-600 text-gray-200;
}
```

---

### Task 5: 验证 Session

- [ ] **Step 1: 确认目录结构**

```
tkt_1/
├── data/                    # 自动创建
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── db/
│       ├── schema.sql
│       ├── index.ts
│       └── init.ts
├── .env.example
├── .env.local
├── package.json
└── tsconfig.json
```

- [ ] **Step 2: LSP 诊断**

对所有已创建文件运行 `lsp_diagnostics`，确保零 error。

- [ ] **Step 3: 开发服务器验证**

```bash
npm run dev
```

确认启动成功无报错后停止。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 项目初始化 + DB schema + 连接模块"
```

---

> **下一 Session:** Session 02 — DAO 层实现（types + 所有数据访问函数）
