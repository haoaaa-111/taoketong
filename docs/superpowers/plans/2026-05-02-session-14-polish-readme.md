# Session 14 — 最终抛光 + README + 验收清单

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全局 UI 抛光、README 文档编写、完整功能验收，确保项目达到可交付状态。

**Architecture:** 不涉及新功能开发，仅修改样式、文档和验证。Gemini 风格 UI 打磨。

**Tech Stack:** TailwindCSS, Markdown

**Source docs:**
- `design-spec.md` 前端风格准则（Gemini 风格、大字体、宽松间距、圆润卡片）
- `dev-doc.md` Section 九（部署指南）

**前置依赖:** Session 13（所有前端功能已实现）

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `README.md` | 创建 | 项目说明文档 |
| `.env.example` | 确认 | 环境变量模板 |
| `src/app/globals.css` | 检查 | 全局样式 |
| 所有页面组件 | 检查 | UI 一致性 |

---

### Task 1: 全局 UI 一致性检查

- [ ] **Step 1: 检查所有页面组件的间距和字体**

确保以下规范一致应用：
- 容器圆角 `rounded-xl`（12-16px）
- 卡片 `card` 类统一使用
- 按钮 `btn` / `btn-primary` / `btn-secondary` 统一使用
- 页面间距 `py-12 px-4`
- 容器最大宽度 `max-w-2xl`（表单）/ `max-w-4xl`（列表）/ `max-w-6xl`（课表）

- [ ] **Step 2: 检查深色模式一致性**

所有页面使用：
- 背景 `bg-gray-950`
- 文字 `text-gray-100`（主）/ `text-gray-400`（次要）
- 边框 `border-gray-700` / `border-gray-800`
- 输入框 `bg-gray-900 border-gray-700`

- [ ] **Step 3: 修复发现的 UI 不一致**

---

### Task 2: 全局 CSS 优化

- [ ] **Step 1: 确认或修改 `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
}

/* 通用卡片样式 */
.card {
    @apply bg-gray-800/50 border border-gray-700/50 rounded-xl p-6;
}

/* 通用按钮样式 */
.btn {
    @apply px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-primary {
    @apply bg-blue-600 hover:bg-blue-500 text-white;
}
.btn-secondary {
    @apply bg-gray-700 hover:bg-gray-600 text-gray-200;
}

/* 滚动条美化 */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    @apply bg-gray-900;
}
::-webkit-scrollbar-thumb {
    @apply bg-gray-700 rounded-full;
}
```

---

### Task 3: README 文档

- [ ] **Step 1: 创建 `README.md`**

```markdown
# 逃课通（SkipClass）

> AI 驱动的个性化逃课方案生成器

## 功能特性

- 📸 **课表图片解析**：上传课表截图，AI 自动提取课程信息
- 🧠 **个性化画像**：根据你的逃课动机、频率偏好生成专属方案
- 🤖 **AI 智能排课**：综合考虑点名方式、老师风格、历史数据生成大胆方案
- ✅ **反馈闭环**：方案接受/打回/周后回顾，持续优化方案质量
- 🔒 **隐私优先**：所有数据存储在本地 SQLite，不上传任何信息

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript (Strict Mode) |
| 数据库 | SQLite (better-sqlite3) |
| LLM | OpenAI 兼容 API |
| UI | React + TailwindCSS（深色模式） |

## 快速开始

### 环境要求

- Node.js 20+
- 支持 OpenAI 兼容 API 的 LLM 服务

### 安装

```bash
# 1. 克隆/下载项目
cd skip-class

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填写 LLM API Key

# 4. 启动开发服务器
npm run dev
```

### 环境变量

```env
# LLM API 配置（必填）
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

### 首次使用

1. 打开浏览器访问 `http://localhost:3000`
2. 首次向导会引导你完成：
   - 课表图片导入
   - 用户画像设置
   - 课程信息校对
3. 完成后 AI 会自动生成首份方案

### 生产环境

```bash
npm run build
npm run start
```

## 数据

所有数据存储在 `./data/skipclass.db`，这是唯一的数据文件，可备份此文件进行迁移。

## License

MIT
```

---

### Task 4: 数据库入口 API 修复

- [ ] **Step 1: 课程 POST API 补充**

检查 `src/app/api/courses/route.ts`，确保 `POST` 方法存在，支持创建课程和排期：

```typescript
export async function POST(request: Request) {
    const body = await request.json();

    // 创建排期
    if (body.schedule) {
        const id = dbCourses.insertSchedule({
            course_id: body.course_id,
            weeks: body.weeks,
            day_of_week: body.day_of_week,
            period_slot: body.period_slot,
        });
        return NextResponse.json({ success: true, id });
    }

    // 创建课程
    const id = dbCourses.insertCourse({
        name: body.name,
        location: body.location,
        teacher_name: body.teacher_name,
        credits: body.credits,
        course_type: body.course_type,
        study_mode: body.study_mode,
        teacher_attitude: body.teacher_attitude,
        escape_difficulty: body.escape_difficulty,
        rollcall_methods: body.rollcall_methods,
        catch_tolerance_per_class: body.catch_tolerance_per_class,
        max_catch_limit: body.max_catch_limit,
        exam_weeks: body.exam_weeks,
        notes: body.notes,
        current_caught_count: 0,
        rollcall_history: [],
    });

    return NextResponse.json({ success: true, data: dbCourses.getCourseById(id) });
}
```

---

### Task 5: 最终验收

- [ ] **Step 1: LSP 诊断** — 对整个 `src/` 目录运行，确保零 error。

- [ ] **Step 2: 完整功能验收清单**

| # | 功能 | 状态 | 验证方法 |
|---|------|------|----------|
| 1 | DB 初始化 | ☐ | `npm run dev` 启动无报错，检查 `data/skipclass.db` 创建 |
| 2 | `/api/health` | ☐ | `curl http://localhost:3000/api/health` → `{"status":"ok"}` |
| 3 | 首页路由 | ☐ | `/` 自动跳转到 `/onboarding`（首次）或 `/schedule`（已有数据） |
| 4 | Onboarding Step 1 | ☐ | 上传图片 → 解析成功 → 显示课程预览 → 可填写周次 |
| 5 | Onboarding Step 2 | ☐ | 问卷表单 → 数据写入 profile + config → 跳转 Step 3 |
| 6 | Onboarding Step 3 | ☐ | 逐门编辑课程 → 全部存入 DB → 生成方案 → 跳转 `/schedule` |
| 7 | 课表展示 | ☐ | 显示方案网格、行动标签、课程名称、图例 |
| 8 | 打回重做 | ☐ | 弹窗 → 输入意见 → 提交 → 重新生成方案 |
| 9 | 接受方案 | ☐ | 方案状态变更为 accepted |
| 10 | 补充情报 | ☐ | 弹窗 → 提交 → 记录反馈 |
| 11 | Settings 页面 | ☐ | 学期时间修改 → 导出 JSON → 弹窗确认重置 |
| 12 | 导航栏 | ☐ | 课表/设置 切换正常 |
| 13 | UI 一致性 | ☐ | 所有页面使用统一卡片/按钮样式，深色模式一致 |

- [ ] **Step 3: `npm run build` 验证**

```bash
npm run build
```

确保构建成功无 error。

- [ ] **Step 4: 提交最终版本**

```bash
git add -A
git commit -m "feat: 全局 UI 抛光 + README + 最终验收"
```

---

## 🎉 交付完成

所有 14 个 Session 完成，项目可交付状态确认：

- ✅ 数据库完整（9 张表 + schema + 8 个 DAO）
- ✅ LLM 客户端（openai 封装 + vision 支持）
- ✅ Agent 模块（Parser, Memory, Modeler, Supervisor, Orchestrator）
- ✅ 11 个 API 路由
- ✅ 完整前端（Onboarding 3 步 + Schedule + Settings）
- ✅ 反馈闭环（即时 + 周后）
- ✅ 文档（README + 施工文档 14 份）
