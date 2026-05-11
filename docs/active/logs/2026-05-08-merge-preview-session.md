# Merge-Preview 分支修复与迭代 — 会话记录

> 日期: 2026-05-08 ~ 2026-05-09
> 参与: @sisyphus (orchestrator), @zch (human)
> 分支: merge-preview
> 工作树: /home/zch/tkt_1/.worktrees/merge-preview

---

## 阶段一：编译/类型错误修复 (2026-05-08)

**入口**: `npm run build` 报错。

| # | 文件 | 问题 | 修复 |
|---|------|------|------|
| 1 | `orchestrator.ts:32` | snake_case → camelCase 字段不匹配 | 加 `.map()` 转换 |
| 2 | `memory.ts` | Zod schema 缺 `detected_patterns`/`suggested_actions`，且 `message` 应改为 `summary` | 补字段 + 重命名 |
| 3 | `db/index.ts` | 缺 `busy_timeout`，Next.js build 多 worker 并行 SQLITE_BUSY | 加 pragma |
| 4 | `compressor.ts` | `decayWeight` 未实现 | 实现函数 |
| 5 | `sessions.ts` | `"draft"` 双引号在 SQLite 中被解析为列名 | 改为单引号 |

同时修复了 4 个测试文件的 mock 数据不匹配问题（蛇形/驼峰字段不一致）。

**结果**: `npm run build` 0 error, `npx jest` 250/250 pass。

---

## 阶段二：LLM 集成与运行时调试 (2026-05-08 ~ 2026-05-09)

### 2.1 API Key 配置
- 从 DashScope 切到 OpenCode Go (`https://opencode.ai/zen/go/v1`)
- 模型: `kimi-k2.5` (vision) → `deepseek-v4-pro` (非 vision) → `qwen3.6-plus` (vision) → 最终切回 `kimi-k2.5`

### 2.2 Cloudflare 524 超时修复
**根因**: kimi-k2.5 的 vision 请求处理时间超过 Cloudflare 100s 代理超时。

修复:
- `llm.ts`: 启用 streaming，让 SSE 事件保活连接
- `llm.ts`: 524/timeout 错误不重试（重试 = 再扣钱 + 再超时）
- `llm.ts`: timeout 30s → 300s

### 2.3 JSON 截断修复
**根因**: `max_tokens` 默认 4096，课表 JSON 超过上限被截断，`JSON.parse` 失败。日志里能看到半个 JSON 对象。

修复: 去掉 `max_tokens` 默认上限，让模型决定。

### 2.4 kimi-k2.5 推理耗时诊断
**发现**: kimi-k2.5 每个 response 有 ~80% token 是 reasoning（Chain-of-Thought）:
```
completion_tokens: 907 total
├── reasoning_tokens: 748 (82%)  ← 内心独白
└── visible content:   159 (18%)  ← 实际输出
```
解释了为什么 13 条 action 生成需要 211s。

修复: 加 `LLM_DEBUG=true` 环境变量，开启时 reasoning 内容流式打印到 stderr。

### 2.5 离网测试脚本
**目标**: 不启动 `npm run dev`，直接读写 SQLite + 调 LLM 生成方案。

创建:
- `scripts/seed-test-data.ts` — 6 门课 13 课次 + 用户画像种子
- `scripts/generate-plan.ts` — 直调 orchestrator 生成方案

用法:
```bash
npx tsx scripts/seed-test-data.ts    # 灌数据
npx tsx scripts/generate-plan.ts     # 生成方案
LLM_DEBUG=true npx tsx scripts/generate-plan.ts  # 看推理过程
```

---

## 阶段三：Step3 渲染去重 + Step1 周数编辑 (2026-05-08)

### 3.1 Step3 去重
**问题**: 同一门课 3 个课次渲染 3 个一模一样的 `CourseEditor`。
**修复**: `step3/page.tsx` 渲染前 `Set` 按 `course.name` 去重。提交逻辑本来就去重了，不动。

### 3.2 Step1 周数可编辑
**问题**: Step1 周数只读，要到 Step3 才能改。
**修复**: `Step1CourseGroup.tsx` 周数从 `<span>` 改为 `<input>`，回车/失焦提交。`CourseEditor.tsx` 删除冗余的"排期修正"字段 + 死代码。

---

## 阶段四：周粒度方案探索 (2026-05-09)

### 4.1 问题
`plan_action` 表一条记录对应一个课次、适用于所有周。用户要求支持「第 11 周逃高数、第 12 周上高数」的周粒度决策。

### 4.2 实验
改 `prompts/supervisor.md`，让 LLM 输出 `{ schedule_id, week, action, reason }` 格式。13 课次 × 4 周 = 52 条 action。

### 4.3 结果
- 52 条输出导致 LLM 调用超时（600s+）
- 即使不超时，self-check 的 7 条规则都是单周设计，遇到 52 条直接挂（规则 1 逃课数永远超限）
- 3 次重试全失败，每次约 2000+2000 token

### 4.4 决策
- 周粒度方案另开 session 完整实现（加 week 列、改 validator、改 prompt、改 orchestrator）
- 具体 prompt 见下方「委派」部分

---

## 阶段五：贝叶斯层诊断 (2026-05-09)

### 5.1 发现的问题
1. `modeler-pool.ts:75` — `observedWeeks` 用 `schedules[0]?.weeks`（课表 1-16 周）而非实际观测周数，0 观测时误跑 16 次 update
2. DB snapshot 的 Bayesian 后验和风险引擎的 Bayesian 是两套算法，引擎算出结果不回写 snapshot，下次冷启动重算
3. `generateCourseSnapshot()` 的 `caught_history.total` 永远为 0（未读 `current_caught_count`）

### 5.2 决策
贝叶斯层另开 session 修复，与本 session 的周粒度工作并行。

---

## 委派：新 session 工作项

### 项 1：贝叶斯层修复
```
在 merge-preview 分支诊断并修复 Bayesian 层的所有 bug。已知问题：
1. modeler-pool.ts:75 observedWeeks 用错源数据
2. DB snapshot 和风险引擎用了两套 Bayesian，引擎结果不回写
3. 其他潜在数据不一致
改的文件：src/agents/modeler-pool.ts, src/agents/risk/, src/db/memory.ts
不动：prompts/, scripts/, 测试文件本身
```

### 项 2：周粒度方案
```
把周粒度方案功能完整实现：plan_action 表加 week 列，supervisor prompt 输出带 week，
rule-validator 按周检验。贝叶斯层另一个 session 在并行改，别动 src/agents/risk/
和 src/db/memory.ts。
```

---

## 数据流速查（本会话建立的理解）

```
数据源                       用途
─────────────────────────────────────────────
localStorage onboarding_step1  → Step1/Step3 前端临时数据
SQLite user_profile            → Step2 提交，orchestrator 读
SQLite user_config             → Step2 提交，orchestrator 读
SQLite course + course_schedule → Step3 提交
SQLite course_memory (snapshot) → orchestrator 读，每次 run 更新
SQLite plan_session + plan_action → orchestrator 写，前端显示
.env.local                     → LLM API key + base URL + model

路由决策: GET /api/init → 查 plan_session 是否存在 (draft/accepted) → /schedule 或 /onboarding
```

---

## 未完成项目（本会话移交）

| 项目 | 状态 | 去向 |
|------|------|------|
| 贝叶斯层 bug 修复 | 未开始 | 新 session |
| 周粒度方案实现 | prompt 实验完成，需完整实施 | 新 session |
| 熔断器日志改进 | 已修复不重试逻辑 | 后续 |
| 52-action 超时优化 | 诊断完成，等待周粒度 implementation | 后续 |
