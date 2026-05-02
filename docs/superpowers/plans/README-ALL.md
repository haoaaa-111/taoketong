# 逃课通（SkipClass）— 施工文档总览

> **生成日期:** 2026-05-02  
> **基于:** `design-spec.md` v0.5 + `dev-doc.md` v1.0-dev  
> **文档总数:** 14 个 Session 文档

---

## 使用说明

1. **按 Session 序号顺序执行**，每个 Session 是独立的上下文单元
2. 每个 Session 文档对应 AI Agent 的一个工作 session（context size 适中）
3. 每个 Session 开始前确认 **前置依赖** 已完成
4. 每个 Session 结束时必须完成 **验证清单** 和 **git 提交**
5. 执行指令：`使用 superpowers/executing-plans 执行 docs/superpowers/plans/2026-05-02-session-XX-*.md`

---

## Session 总览

| Session | 文档文件 | 阶段 | 主要交付物 | 预估复杂度 |
|---------|---------|------|-----------|-----------|
| **01** | `session-01-project-db-init.md` | 基础架构 | Next.js 项目、DB schema、连接模块、初始化钩子 | ⭐⭐ |
| **02** | `session-02-types-dao.md` | 基础架构 | 全局类型定义、5 个 DAO 文件（courses/profile/sessions/feedback/memory） | ⭐⭐⭐⭐ |
| **03** | `session-03-llm-parser.md` | 数据录入 | LLM 客户端、Parser Agent、`/api/parse-image` | ⭐⭐⭐ |
| **04** | `session-04-infrastructure-apis.md` | 数据录入 | health/init/profile/config/courses CRUD 共 5 个 API | ⭐⭐⭐ |
| **05** | `session-05-memory-modeler.md` | 方案生成 | Memory Agent + Modeler Agent（prompt + 函数各2文件） | ⭐⭐ |
| **06** | `session-06-supervisor-orchestrator.md` | 方案生成 | Supervisor Agent、Orchestrator 编排、session/latest API | ⭐⭐⭐⭐ |
| **07** | `session-07-feedback-apis.md` | 反馈闭环 | immediate/weekly 两个反馈 API | ⭐⭐ |
| **08** | `session-08-onboarding-step1.md` | 数据录入 | 首页路由 + Onboarding Step 1（课表导入 UI） | ⭐⭐⭐ |
| **09** | `session-09-onboarding-step2.md` | 数据录入 | Onboarding Step 2（用户画像问卷） | ⭐⭐ |
| **10** | `session-10-onboarding-step3.md` | 数据录入 | Onboarding Step 3（课程校对）+ 首次方案生成 | ⭐⭐⭐⭐ |
| **11** | `session-11-schedule-page.md` | 前端页面 | Schedule 课表展示页面（网格 + 周次导航） | ⭐⭐⭐ |
| **12** | `session-12-settings-ui.md` | 前端页面 | Settings 页面 + Modal 组件 | ⭐⭐ |
| **13** | `session-13-feedback-ui-nav.md` | 反馈闭环 | 反馈操作 UI（打回/接受/情报） + 全局导航栏 | ⭐⭐⭐ |
| **14** | `session-14-polish-readme.md` | 抛光验收 | UI 一致性检查、README、完整功能验收 | ⭐⭐ |

---

## 阶段划分

### Phase 1: 基础架构（Session 01-02）
纯后端基础设施。No UI, No AI, just database + types + DAO.

**完成标志：** 所有 DAO 函数可正常读写 SQLite。

### Phase 2: Agent + API（Session 03-07）
LLM 客户端、Agent 模块、所有 API 路由。

**完成标志：** 11 个 API 路由全部可用，Agent 串联可正常生成方案。

### Phase 3: Onboarding（Session 08-10）
三步导向流程 + 首次方案生成。

**完成标志：** 从空状态完成课表导入 → 画像 → 校对 → 自动生成方案 → 进入课表页。

### Phase 4: 展示 + 反馈（Session 11-13）
课表展示、反馈操作、导航栏、设置页。

**完成标志：** 完整的用户闭环：查看方案 → 接受/打回 → 反馈 → 新方案。

### Phase 5: 抛光（Session 14）
全局一致性、README、验收。

---

## 完整文件树（预期）

```
├── .env.example
├── .env.local
├── README.md
├── data/
│   └── skipclass.db
├── docs/superpowers/plans/
│   ├── README-ALL.md                    ← 本文件
│   ├── 2026-05-02-session-01-project-db-init.md
│   ├── 2026-05-02-session-02-types-dao.md
│   ├── 2026-05-02-session-03-llm-parser.md
│   ├── 2026-05-02-session-04-infrastructure-apis.md
│   ├── 2026-05-02-session-05-memory-modeler.md
│   ├── 2026-05-02-session-06-supervisor-orchestrator.md
│   ├── 2026-05-02-session-07-feedback-apis.md
│   ├── 2026-05-02-session-08-onboarding-step1.md
│   ├── 2026-05-02-session-09-onboarding-step2.md
│   ├── 2026-05-02-session-10-onboarding-step3.md
│   ├── 2026-05-02-session-11-schedule-page.md
│   ├── 2026-05-02-session-12-settings-ui.md
│   ├── 2026-05-02-session-13-feedback-ui-nav.md
│   └── 2026-05-02-session-14-polish-readme.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── src/
    ├── db/
    │   ├── schema.sql
    │   ├── index.ts
    │   ├── init.ts
    │   ├── courses.ts
    │   ├── profile.ts
    │   ├── sessions.ts
    │   ├── feedback.ts
    │   └── memory.ts
    ├── types/
    │   └── index.ts
    ├── lib/
    │   └── llm.ts
    ├── agents/
    │   ├── prompts/
    │   │   ├── parser.md
    │   │   ├── memory.md
    │   │   ├── modeler.md
    │   │   └── supervisor.md
    │   ├── parser.ts
    │   ├── memory.ts
    │   ├── modeler.ts
    │   ├── supervisor.ts
    │   └── orchestrator.ts
    ├── app/
    │   ├── page.tsx
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── onboarding/
    │   │   ├── page.tsx
    │   │   ├── step1/page.tsx
    │   │   ├── step2/page.tsx
    │   │   └── step3/page.tsx
    │   ├── schedule/page.tsx
    │   ├── settings/page.tsx
    │   └── api/
    │       ├── health/route.ts
    │       ├── init/route.ts
    │       ├── profile/route.ts
    │       ├── config/route.ts
    │       ├── parse-image/route.ts
    │       ├── courses/route.ts
    │       ├── courses/[id]/route.ts
    │       ├── session/route.ts
    │       ├── session/latest/route.ts
    │       ├── feedback/immediate/route.ts
    │       └── feedback/weekly/route.ts
    └── components/
        ├── layout/
        │   └── Navbar.tsx
        ├── onboarding/
        │   ├── Step1ImageUpload.tsx
        │   ├── Step1CoursePreview.tsx
        │   └── ChipSelect.tsx
        ├── schedule/
        │   ├── ScheduleGrid.tsx
        │   ├── WeekNav.tsx
        │   ├── FeedbackActions.tsx
        │   ├── RejectDialog.tsx
        │   └── IntelDialog.tsx
        └── ui/
            └── Modal.tsx
```

---

## Session 间的依赖链

```
Session 01 → Session 02 → Session 03 → Session 04 → Session 07
                    │           │          │
                    └───────────┤          │
                                ↓          ↓
                        Session 05 → Session 06
                                        │
                                        ↓
Session 08 → Session 09 → Session 10 ←──┘
                         │
                         ↓
    Session 11 ←─ Session 12 ←─ Session 13
                         │
                         ↓
                    Session 14
```

**关键交汇点：**
- Session 06 需要 Session 04 05 完成（DAO + Memory/Modeler）
- Session 10 需要 Session 06 完成（方案生成 API）
