# SkipClass — 技术债登记

> 最后更新: 2026-05-06 (Chunk 4 完成)
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
