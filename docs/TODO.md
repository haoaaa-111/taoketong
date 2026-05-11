# SkipClass — 全局待办清单

> 最后更新: 2026-05-09 (merge-preview 分支修复会话)
> 规则: 每次 Session 开始/结束必须更新此文件

---

## 未完成

### 🔴 高优先级（阻塞）
- [ ] [Bayesian] Bayesian 层数据管道修复 — 新 session | 2026-05-09 | 阻塞: 无
  - observedWeeks 源数据错误 (modeler-pool.ts:75)
  - Snapshot 与 Risk Engine 两套 Bayesian
  - caught_history.total 永远为 0
- [ ] [WeekGranularity] 周粒度方案完整实现 — 新 session | 2026-05-09 | 阻塞: 无
  - plan_action 加 week 列
  - supervisor prompt 输出带 week
  - rule-validator 按周检验

### 🟡 中优先级（正常推进）
- [ ] [施工文档] 继续完善项目文档体系

## 已完成
- [x] [MergeFix] merge-preview 分支编译/类型/测试修复 — @sisyphus | 2026-05-08
  - 5 个编译错误修复 (orchestrator, memory, db, compressor, sessions)
  - 4 个测试 mock 修正
  - build 0 error, 250/250 tests pass
- [x] [LLM] LLM 集成与运行时修复 — @sisyphus | 2026-05-08
  - OpenCode Go API 接入 (.env.local)
  - Cloudflare 524 修复 (streaming, 不重试)
  - JSON 截断修复 (去 max_tokens 上限)
  - kimi-k2.5 reasoning 诊断 (LLM_DEBUG)
- [x] [Tooling] 离网测试脚本 — @sisyphus | 2026-05-09
  - scripts/seed-test-data.ts (6 门课 13 课次)
  - scripts/generate-plan.ts (直调 orchestrator)
- [x] [UX] Step3 去重渲染 — @sisyphus | 2026-05-08
- [x] [UX] Step1 周数可编辑 — @sisyphus | 2026-05-08
- [x] [Chunk 0] Agent 层关键 Bug 修复 — @sisyphus | 2026-05-05
- [x] [Chunk 1] 记忆管理层重构 — @sisyphus | 2026-05-05
- [x] [Chunk 2] Supervisor + Orchestrator 解耦 — @sisyphus | 2026-05-05
- [x] [Chunk 3] 自进化闭环 — @sisyphus | 2026-05-05
- [x] [Chunk 4] 生产硬化 — @sisyphus | 2026-05-06
- [x] [Session Plan] 项目施工文档体系创建 — @assistant | 2026-05-02
- [x] [Onboarding 改进] Step1/2/3 改进全量上线 — @sisyphus | 2026-05-03
- [x] [滚动选择器/特殊课次修复] ScrollPicker 灵敏度+颜色优化，特殊课次类型添加修复 — @sisyphus | 2026-05-03
