# Prompt System — 现存问题清单

> [ACTIVE] 创建日期: 2026-05-09
> 基于 `src/agents/` + `prompts/` + `src/types/` 全量代码审查
> 状态: ⏳ 待处理（6 个未修复，1 个已修复）

---

## ✅ 已修复

### P-002 | Supervisor prompt 双源定义（内容重叠）

**严重度**: 🟠 高 → ✅ 已偿还  
**修复日期**: 2026-05-09

**问题**: `prompts/supervisor.md`（system role）和 `prompt-builder.ts` 的 Layer 1/5/6（user role）重复定义了 Agent 身份、7 条自检规则、输出 JSON 格式。LLM 在同一请求中收到两套措辞不同的指令。

**修复**: 
- 从 `prompt-builder.ts` 中移除了 `LAYER1_AGENT_IDENTITY`、`LAYER5_SELFCHECK_RULES`、`LAYER6_BEHAVIOR_GUIDANCE` 及其对应的 `blocks.push()` 调用
- 将缺失内容（"有理有据"语气、retry_hint 指引、reason 要求）合并到 `prompts/supervisor.md`
- `prompt-builder.ts` 现在只负责 3 个动态数据块（学期上下文、课程记忆、风险评估）+ retry_hint
- 变更文件: `src/agents/prompt-builder.ts` (133→88行), `prompts/supervisor.md` (52→53行), `src/__tests__/agents/prompt-builder.test.ts`

---

## 🔴 未修复（高优先级）

### P-003 | Memory Agent prompt 输出格式与 Zod Schema 字段不一致

**严重度**: 🔴 严重  
**发现**: `prompts/memory.md` vs `src/agents/memory.ts:11-16`

**具体不一致**:

| 字段 | memory.md 让 LLM 输出 | Zod Schema 期望 | 后果 |
|------|----------------------|----------------|------|
| `updates[].course_name` | ✅ 明确要求 | ❌ `z.record()` 无此约束 | LLM 可能不输出此字段 |
| `updates[].fields_to_update` | ✅ 嵌套对象 | ❌ 无此结构 | LLM 输出的有用结构被忽略 |
| `message` | ✅ 顶层字段 | ❌ 不存在 | 被静默丢弃 |
| `summary` | ❌ 不存在 | ✅ 顶层必填字段 | 永远为 undefined |
| `detected_patterns` | ❌ 不存在 | ✅ 可选字段 | LLM 不会输出 |
| `suggested_actions` | ❌ 不存在 | ✅ 可选字段 | LLM 不会输出 |

**根因**: `MemoryOutputSchema = z.object({ updates: z.array(z.record(z.string(), z.unknown())) })` 使用了 `z.record()` 而非精确的嵌套对象定义，任何 LLM 输出都能通过校验，但实际有效字段（如 `course_name`）可能在 LLM 输出中丢失。

**影响范围**:
- `src/agents/memory.ts:11-16` — Schema 定义
- `prompts/memory.md:16-30` — LLM 指令中的输出格式
- `src/app/api/feedback/immediate/route.ts:59-61` — 只读取 `updates.length`，不校验内容
- `src/app/api/feedback/weekly/route.ts:73-79` — 同上

---

### P-005 | Risk Fusion Layer 已实现但未被集成

**严重度**: 🔴 严重  
**发现**: `src/agents/risk/` vs `src/agents/modeler-pool.ts`

**已实现的融合系统**:

```
src/agents/risk/
├── bayesian-model.ts    — Beta-Binomial 贝叶斯点名模型（带衰减权重）
├── rule-engine.ts       — 基于规则的确定性风险评估（优先级驱动）
├── fusion-layer.ts      — 三层融合器：Rule + Bayesian + LLM → FusionResult
└── index.ts             — Barrel exports
```

`FusionResult` 包含:
- `risk_level` — 综合风险等级
- `confidence` — 0-1 置信度
- `components` — { rule_based, bayesian, llm } 三分量详情
- `disagreement_flag` — 冲突检测（rule_vs_llm / bayes_vs_rule / all_conflict）+ 解决策略

**实际调用路径**:

```typescript
// modeler-pool.ts:12 — 只调用了 LLM Modeler
results[c.courseId] = await modelCourseRisk(c.snapshot);
// ↑ 返回 { risk_level, risk_reason, next_caught_probability }
// ✗ Rule Engine 未被调用
// ✗ Bayesian Model 未被调用
// ✗ fuse() 融合函数未被调用
```

**下游丢失的信息** — `context-builder.ts:46-48` 中风险被扁平化为三个字段：
```typescript
risk_result: { risk_level, risk_reason, next_caught_probability }
// ✗ confidence 丢失 → Supervisor 不知道风险评估的可靠程度
// ✗ disagreement_flag 丢失 → Supervisor 不知道多源判断是否冲突
// ✗ components 丢失 → Supervisor 看不到每个维度的独立评估
```

---

### P-006 | Memory Agent LLM 输出未被持久化

**严重度**: 🔴 严重  
**发现**: `src/app/api/feedback/immediate/route.ts:58-63` + `src/app/api/feedback/weekly/route.ts:72-84`

**调用链**:

```
用户反馈文本 → parseUserInput() [LLM 调用, 花费 token]
  → MemoryOutput { updates, summary, detected_patterns, suggested_actions }
  → console.log('[Memory] Parsed', ...)
  → ❌ 未写入数据库，未更新课程快照
```

**问题**: 每次调用消耗 LLM token 解析用户反馈，返回结构化的课程更新信息后**只打印日志**。下次生成方案时这些语义信息全部丢失。

**现有的另一条持久化路径**（`feedback/immediate/route.ts:50-56`）:
```typescript
const allSnapshots = dbMemory.getAllCourseSnapshots();
for (const s of allSnapshots) {
    dbMemory.updateCourseMemory(s.course_id);
}
```
但 `updateCourseMemory()` 从 DB 中的结构化课程数据重新生成快照，**并未应用 Memory Agent 的 `updates` 结果**。

**两条路径互不通信** — Memory Agent 解析到的语义（如 "高等数学老师开始严抓"）没有机制转化为 DB 中的 `teacher_attitude = '严抓'`。

---

## 🟡 未修复（中优先级）

### P-001 | Prompt 文件是纯静态模板，无动态注入能力

**严重度**: 🟡 中等  
**发现**: 4 个 `prompts/*.md` 文件 vs 各 Agent 的调用代码

**当前状态**: 所有 prompt 文件通过 `readFileSync` 一次性完整读入，作为不可变字符串使用。所有动态信息在**代码层面**以模板字面量拼接到 user prompt 中：

| Agent | Prompt 文件 | 动态信息注入方式 |
|-------|-----------|----------------|
| Parser | `parser.md` | 无动态内容 |
| Modeler | `modeler.md` | `` `课程信息：\n\n${snapshot}` ``（代码拼接） |
| Memory | `memory.md` | `wrapUserInput(userInput)`（代码包裹） |
| Supervisor | `supervisor.md` | `prompt-builder.ts` 3 个动态数据块 |

**影响**: 无法在 prompt 文件中使用变量、条件或循环。所有需要根据运行时状态调整的 prompt 内容必须在 TypeScript 代码中处理。如果未来需要根据用户偏好调整 prompt 语气，需要修改代码而非 prompt 文件。

**注意**: P-002 的修复使 Supervisor 的 prompt 双源问题得到解决，但**整体的 prompt 管理系统性设计**（问题 P-007）仍需处理。

---

### P-004 | Prompt 层拼接使用硬编码分隔符，层边界不可识别

**严重度**: 🟡 中等  
**发现**: `src/agents/prompt-builder.ts:87`

```typescript
return blocks.join('\n\n---\n\n');
```

**问题**:
1. **层边界不可枚举** — 无法按名称引用某一层（如"替换风险评估块"）
2. **内容混淆风险** — 如果数据块中包含 `---`（如课程名含破折号），可能与分隔符混淆
3. **层序耦合** — 层的顺序由 `blocks.push()` 隐式保证，没有元数据标记
4. **无逐层开关** — 无法条件性禁用某层（只有 retry_hint 的 if 判断）

**改进方向**: 使用 XML 围栏标签（类似 Layer 3/4 已有的 `<course-memory-context>`）统一所有层的边界标记。

---

### P-007 | 无统一的 Prompt Registry / Manager

**严重度**: 🟡 中等  
**发现**: 全项目跨文件分析

**当前 prompt 的 4 种管理方式**:

| 方式 | 位置 | 示例 |
|------|------|------|
| Markdown 文件 | `prompts/*.md` | `readFileSync('prompts/supervisor.md')` |
| 模板字面量 | `prompt-builder.ts:11-22` | `` `${semester_info.current_week}` `` |
| 内联字符串 | `compressor.ts:27`, `curator.ts:150` | `'你是一个数据总结助手...'` |
| 安全前缀 | `prompt-safety.ts:9-13` | `SYSTEM_SAFETY_PREFIX` |

**缺失的能力**:
- **注册发现**: 无法回答"系统中有哪些 prompt？每个属于哪个 agent？"
- **版本追踪**: prompt 变更历史无集中记录（md 文件靠 git，字符串常量靠 git blame）
- **可观测性**: 发送给 LLM 的完整 prompt 无集中日志（metrics 只记录 token 数，不记录内容）
- **校验**: 无自动化检查 prompt 内容是否与 Zod Schema 一致
- **A/B 测试**: 无法在不修改代码的情况下切换 prompt 版本

---

## 🔵 未修复（低优先级 / 观察项）

### P-008 | 自适应温度只在 Supervisor 生效

**严重度**: 🔵 低  
**发现**: `supervisor.ts:37-60` vs `modeler.ts:24`, `parser.ts:16`

- **Supervisor**: 动态温度 0.3-0.8（根据考试周/第一周/高风险课调整）
- **Modeler**: 固定 temperature=0.5
- **Parser**: 固定 temperature=0.3
- **Memory Agent**: 使用默认 temperature=0.7

如果 Modeler 的预测过于自信或随机性强，无法通过温度参数调节。

### P-009 | 无 prompt → Schema 一致性校验

**严重度**: 🔵 低  
**发现**: P-003 的根本原因之一

prompt 文件中描述的 JSON 输出格式（面向 LLM）和 TypeScript 中的 Zod Schema（面向代码）之间没有任何自动化检查。如果修改了 Schema 字段名但忘记更新相应的 prompt 文件，LLM 可能输出错误字段而不会触发任何错误（因为大多数 Schema 使用了宽松的 `z.record()` 或 `as any`）。

---

## 问题关联图

```
P-001(静态模板) ──→ P-007(无注册中心) ──→ P-009(无一致性校验)
                        │
P-003(格式不一致) ───→ P-006(输出未持久化)
                        │
P-005(融合层未集成) ──┘

P-002 ✅ 已修复（双源定义）
P-004 🟡（拼接分隔符）— 影响范围缩小（6层→3层）
P-008 🔵（温度固定）— 独立观察项
```

---

## 附录：已读取的全部相关文件

| 文件 | 行数 | 角色 |
|------|:---:|------|
| `prompts/supervisor.md` | 53 | Supervisor 系统 prompt |
| `prompts/modeler.md` | 31 | Modeler 系统 prompt |
| `prompts/parser.md` | 50 | Parser 系统 prompt |
| `prompts/memory.md` | 36 | Memory 系统 prompt |
| `src/agents/prompt-builder.ts` | 88 | Supervisor user prompt 动态构建 |
| `src/agents/supervisor.ts` | 61 | Supervisor Agent 实现 |
| `src/agents/modeler.ts` | 28 | Modeler Agent 实现 |
| `src/agents/modeler-pool.ts` | 17 | 并行风险建模协调器 |
| `src/agents/parser.ts` | 24 | Parser Agent 实现 |
| `src/agents/memory.ts` | 28 | Memory Agent 实现 |
| `src/agents/context-builder.ts` | 85 | StructuredPlanContext 构建 |
| `src/agents/rule-validator.ts` | 178 | 方案自检规则引擎 |
| `src/agents/orchestrator.ts` | 117 | Session 编排器 |
| `src/agents/risk/rule-engine.ts` | 71 | 规则引擎 |
| `src/agents/risk/bayesian-model.ts` | 71 | 贝叶斯点名模型 |
| `src/agents/risk/fusion-layer.ts` | 92 | 三层风险融合器 |
| `src/agents/memory-provider.ts` | 65 | MemoryProvider 接口 |
| `src/agents/memory-manager.ts` | 83 | 插件式记忆管理器 |
| `src/agents/compressor.ts` | 74 | 学期数据压缩 |
| `src/agents/curator.ts` | 165 | 定期质量审查 |
| `src/lib/llm.ts` | 204 | LLM 通信层 |
| `src/lib/prompt-safety.ts` | 97 | Prompt 注入防御 |
| `src/types/index.ts` | 332 | 全类型定义 |
| `src/lib/validation.ts` | 116 | Zod API 校验 Schemas |
