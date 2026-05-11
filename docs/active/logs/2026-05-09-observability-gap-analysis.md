# 可观测性差距分析

> 日期: 2026-05-09
> 范围: 评估、错误处理、追踪
> 状态: 摸底完成，等待决策

---

## 1. 现状总览

```
                    ┌──────────────────────────────┐
                    │        npm run dev / tsx      │
                    │                              │
                    │  ┌──────────────────────┐    │
                    │  │ Orchestrator          │    │
                    │  │   trace_id ← crypto   │    │
                    │  │   logger.info/warn    │    │
                    │  │   metrics (JSON)      │    │
                    │  └──────┬───────────────┘    │
                    │         │                     │
                    │  ┌──────▼───────────────┐    │
                    │  │ lib/errors.ts         │    │
                    │  │   handleError() → 500 │    │
                    │  │   dev: raw msg        │    │
                    │  │   prod: "内部服务器错误"│    │
                    │  └──────┬───────────────┘    │
                    │         │                     │
                    │  ┌──────▼───────────────┐    │
                    │  │ lib/llm.ts             │    │
                    │  │   circuit breaker      │    │
                    │  │   5 fails → 60s cool   │    │
                    │  └──────────────────────┘    │
                    │                              │
                    │  全部输出 → stderr / stdout   │
                    └──────────────────────────────┘
                                   │
                                   ▼
                           终端关闭 → 全部丢失
```

## 2. 分层评估

### 2.1 错误处理

| 组件 | 当前实现 | 评分 | 缺失 |
|------|---------|:----:|------|
| HTTP 错误码 | 只有 500 | ⭐⭐ | 无 400/403/429/503 细分 |
| 错误分类 | `ERR_CODES` 常量定义了 7 种但未落地 | ⭐⭐ | 只在 HTTP 层用了一个地方 |
| 熔断器 | 5 次失败 → 60s，在 `llm.ts` 内 | ⭐⭐⭐ | 内存状态重启丢失；524/timeout 不重试但也未上报 |
| Session 错误 | `SessionGenerationError` 带 code+suggestion | ⭐⭐⭐ | 仅 orchestrator 用，API route 未统一用 |
| 生产脱敏 | dev 返真错误，prod 返"内部服务器错误" | ⭐⭐ | 过于粗暴——用户看到"内部错误"完全不知道发生了什么 |

**未覆盖的异常路径:**
- LLM 返回 JSON 但 Zod 校验失败 → 不区分格式错误 vs 内容错误
- SQLite 锁 (SQLITE_BUSY) → 无重试，直接抛
- `ensureDatabaseReady()` 失败 → `layout.tsx` 静默吞异常

### 2.2 日志

| 维度 | 当前实现 | 评分 | 缺失 |
|------|---------|:----:|------|
| 结构化 | trace_id + module + level + JSON data | ⭐⭐⭐ | — |
| 级别过滤 | `LOG_LEVEL` 环境变量 | ⭐⭐⭐ | — |
| 持久化 | **无** — 全打 stderr | ⭐ | 终端关闭即丢失 |
| 搜索 | **无** — 只能 grep 终端输出 | ⭐ | — |
| 轮转 | **无** | ⭐ | — |

### 2.3 指标

| 维度 | 当前实现 | 评分 | 缺失 |
|------|---------|:----:|------|
| 阶段耗时 | context_build / risk_modeling / plan_generation / persistence | ⭐⭐⭐ | — |
| Token 统计 | **全为 0** — streaming 模式未统计 | ⭐ | 用户不知道花了多少钱 |
| 课程级别 | courses_count / courses_failed | ⭐⭐⭐ | — |
| 重试统计 | retry_count / self_check_passed / temperature | ⭐⭐⭐ | — |
| 持久化 | **无** — 只 log，不存 DB | ⭐ | 无法看历史趋势 |
| 聚合分析 | `getAggregateMetrics()` 函数存在但 0 处调用 | ⭐⭐ | — |

### 2.4 追踪

| 维度 | 当前实现 | 评分 | 缺失 |
|------|---------|:----:|------|
| 链路 ID | `trace_id` (crypto.randomUUID) 注入 orchestrator → logger | ⭐⭐⭐ | — |
| 跨模块传递 | trace_id 只在 `setTraceId/getTraceId` 全局变量 | ⭐⭐ | 并发调用会互相覆盖（Node 单线程可容忍） |
| 外部系统 | Langfuse **已删除** (Chunk 4) | ⭐ | 无任何外部 tracing |
| 请求级追踪 | 仅 `generateSession` 有，HTTP 路由层无 | ⭐⭐ | `/api/session` 的请求进来时没有 trace_id |

### 2.5 成本可见性

当前**零可见性**——用户完全不知道：
- 每次方案生成花了多少钱
- 哪些模型/调用占比最高
- 熔断器触发几次
- `LLM_DEBUG=true` 看 reasoning 只是临时手段

## 3. 优先级建议

| 优先级 | 项目 | 理由 | 改动量 |
|:---:|------|------|:---:|
| 🔴 P0 | Token 统计落地 | 现在全是 0，用户盲跑 LLM 不知成本 | 小 |
| 🔴 P0 | 日志写文件 | 终端一关全丢，调试时反复跑看不到历史 | 小 |
| 🟡 P1 | HTTP 错误码细分 | 前端可以根据不同的错误码给不同的 UI 反馈 | 中 |
| 🟡 P1 | 指标持久化 (SQLite 新表) | 看历史趋势，判断模型质量变化 | 中 |
| 🟢 P2 | 成本可视化页面 | 设置页加一个 token/cost 统计面板 | 中 |
| 🟢 P2 | Langfuse 重新接入 | 外部 tracing，适合生产环境；开发阶段性价比低 | 大 |

## 4. P0 具体改法

### 4.1 Token 统计（`lib/llm.ts`）

当前 streaming 循环只拼 content，不改动也统计 token：
```ts
let inputTokens = 0, outputTokens = 0;
for await (const chunk of stream) {
    if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens || 0;
        outputTokens = chunk.usage.completion_tokens || 0;
    }
    // ... existing content logic ...
}
// 返回 { content, inputTokens, outputTokens }
```
然后 `chatCompletion` 返回值从 `string` 改为 `{ content, inputTokens, outputTokens }`，orchestrator 的 `recordSessionMetrics` 填入真实数值。

### 4.2 日志写文件

在 `logger.ts` 加一个 file transport：
```ts
import fs from 'fs';
const logFile = process.env.LOG_FILE || 'data/app.log';
function writeToFile(line: string) {
    fs.appendFileSync(logFile, line + '\n');
}
```
日志同时打 stderr 和文件。加 `.gitignore` 忽略 `data/*.log`。

---

