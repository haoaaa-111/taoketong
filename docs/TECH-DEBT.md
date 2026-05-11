# SkipClass — 技术债登记

> 最后更新: 2026-05-09 (Bayesian 数据管道修复)
> 状态列: ⏳ 待处理 / 🔧 处理中 / ✅ 已偿还

---

| ID | 描述 | 严重度 | 来源 | 记录日期 | 状态 |
|:---|:---|:---:|:---|:---|:---|
| Bug-1 | `schedule_id` 信息断链 — 快照中 schedules 不含 schedule_id，Supervisor 盲猜 ID | 🔴 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-2 | 重试使用不变 prompt — Orchestrator 重试 3 次但 prompt 完全相同 | 🟠 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-3 | INNER JOIN 静默丢弃数据 — `getLatestSession()` 使用 INNER JOIN | 🟠 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-4 | null 值注入 prompt — config.current_week / day_of_week 可能为 null | 🟠 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-5 | Modeler 单点故障 — 一门课建模失败 → 整个 session 崩溃 | 🟠 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-6 | 空 courses 未检查 — 0 门课时 generateSession 行为未定义 | 🟡 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-7 | `plan_weeks=0` 无告警 — 方案周数为 0 时无任何提示 | 🟡 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-8 | JSON 提取正则边界失效 — `lib/llm.ts` JSON 提取正则不够健壮 | 🟡 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-9 | 无 Zod schema 校验 — LLM 输出使用 `as` 类型断言 | 🟡 | code-review | 2026-05-05 | ✅ 已偿还 |
| Bug-10 | Memory Agent 未被集成 — `parseUserInput()` 定义但 0 处调用 | 🟡 | code-review | 2026-05-05 | ✅ 已偿还 |
| DSG-1 | 单用户 hardcode — db/profile.ts 默认 userId=1 | 🔵 | design | 2026-05-05 | ✅ 已偿还 |
| DSG-2 | 生成与入库耦合 — LLM 调用 + DB 事务同一函数 | 🔵 | design | 2026-05-05 | ✅ 已偿还 |
| DSG-3 | Orchestrator/Supervisor 边界模糊 — prompt 构建在编排器中 | 🔵 | design | 2026-05-05 | ✅ 已偿还 |
| Bug-11 | Memory Agent prompt 与 Zod Schema 字段不一致 — `prompts/memory.md` 输出 `course_name/fields_to_update/message`，但 Zod 期望 `updates/summary/detected_patterns` | 🔴 | prompt-review | 2026-05-09 | ✅ 已偿还 |
| Bug-12 | Memory Agent LLM 输出未持久化 — `parseUserInput()` 结果仅 `console.log`，未写入 DB | 🔴 | prompt-review | 2026-05-09 | ⏳ 待处理 |
| DSG-4 | Risk Fusion Layer 已实现但未集成 — `risk/fusion-layer.ts`（Rule+Bayesian+LLM 三层融合）已被 `modeler-pool.ts` 集成调用 | 🔴 | prompt-review | 2026-05-09 | ✅ 已偿还 |
| DSG-5 | 无统一 Prompt Registry — prompt 分散在 `.md` 文件、硬编码字符串、模板字面量、内联字符串中 | 🟡 | prompt-review | 2026-05-09 | ⏳ 待处理 |
| DSG-6 | Supervisor prompt 双源定义（内容重叠）— `prompts/supervisor.md` 与 `prompt-builder.ts` L1/L5/L6 重复定义身份/规则/格式 | 🟠 | prompt-review | 2026-05-09 | ✅ 已偿还 |
| DSG-7 | 自适应温度仅 Supervisor 使用 — Modeler(p=0.5)、Parser(p=0.3) 固定温度 | 🔵 | prompt-review | 2026-05-09 | ⏳ 待处理 |
| Bug-13 | Bayesian `observedWeeks` 使用课表周数而非实际观测周数 — `modeler-pool.ts:75` 使用 `schedule.weeks`（如 [1..16]），导致 0 观测时误跑 16 次 update | 🔴 | data-pipeline | 2026-05-09 | ✅ 已偿还 |
| Bug-14 | Snapshot `bayesian_posterior` 使用简化公式且从未被 Risk Engine 使用 — 与 `bayesian-model.ts` 的 Exponential Decay Beta-Binomial 不兼容，Risk Engine 从 raw data 重建 | 🔴 | data-pipeline | 2026-05-09 | ✅ 已偿还 |
| Bug-15 | Snapshot `caught_history.total` 永远为 0 — `db/memory.ts` 声明 `caughtWeeks: number[] = []` 但从未从 `course.current_caught_count` 读取 | 🔴 | data-pipeline | 2026-05-09 | ✅ 已偿还 |
| Bug-16 | `generateCourseSnapshot()` 忽略 `course.current_caught_count` — 导致 snapshot 中被抓次数数据丢失 | 🔴 | data-pipeline | 2026-05-09 | ✅ 已偿还 |
| Bug-17 | Rule-validator 全为单周设计 — `runSelfChecks()` 7 条规则无法检验多周 plan_action，周粒度 prompt 产生 52 条 action 时规则 1/4/5 必挂 | 🔴 | design | 2026-05-09 | ⏳ 待处理 |
| Bug-18 | Prompt 重试无缓存命中 — `generateWithRetry` 3 次重试 prompt 仅 `retry_hint` 变化，但 2000 token 输入每次全量重传 | 🟡 | perf | 2026-05-09 | ⏳ 待处理 |
| Bug-19 | kimi-k2.5 reasoning token 占 82% — Chain-of-Thought 耗时远超可见输出，考虑换非 reasoning 模型或关闭 reasoning | 🟡 | perf | 2026-05-09 | ⏳ 待处理 |
