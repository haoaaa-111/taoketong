# SkipClass 架构 v2 — 重组设计文档

> 日期: 2026-05-11
> 状态: 讨论完成，待实施
> 基于: merge-preview 分支工作会话反思

---

## 0. 核心目标

**尽最大概率预测每节课的点名规律。** 数据几乎全部来自用户输入，没有外部数据源。

---

## 1. 架构总览

```
                         ┌────────────────────┐
                         │   User Input        │
                         │  (课表图 / 问卷)     │
                         └────────┬───────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
      │  Parser       │   │  User Profile │   │  Course Info  │
      │  (课表→DB)    │   │  (画像→DB)    │   │  (课程→DB)    │
      └──────────────┘   └──────────────┘   └──────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
      │ Teacher Skill │   │  Rollcall    │   │ Recent Events │
      │  Templates    │   │  Skill       │   │ (最近2周)     │
      │  (MD files)   │   │  (MD files)  │   │ (DB)          │
      └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
             │                  │                   │
             └──────────────────┼───────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │  Dynamic Prompt      │
                    │  Assembly            │
                    │  (prompt-builder.ts) │
                    │  8 Layers            │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Supervisor (SOTA)   │
                    │  1 week at a time    │
                    │  + expandable reason │
                    └──────────┬───────────┘
                               │
                         ┌─────┴─────┐
                         ▼           ▼
                    Accepted     Rejected
                         │           │
                    Next Week    Regenerate
                    (prior=plan) (feedback)
```

---

## 2. 移除贝叶斯层

### 2.1 理由

- 贝叶斯（Beta-Binomial）需要大量观测数据才有统计意义，本项目每门课观测数据极少（最多几周的用户自报记录）
- 用户自报数据自带偏见（逃课被抓时不一定如实汇报），统计推断不可靠
- 复杂的统计模型不如"可解释的启发式规则 + LLM 语义理解"有效
- `src/agents/risk/` 目录下的 rule-engine、bayesian-model、fusion-layer 全移除

### 2.2 替代方案

用 **老师类型 Skill** + **通用点名 Skill** 替代概率模型。这些以 prompt 片段形式注入 supervisor，让 LLM 基于人类可理解的规则做决策。

---

## 3. 老师类别 Skill

### 3.1 概念

预定义的 prompt 模板库，描述不同类型老师的点名行为模式。用户在 Step3 为每门课标注老师类型时触发对应模板注入。

### 3.2 模板列表

存储位置：`prompts/skills/teachers/*.md`

| 模板文件 | 老师类型 | 点名频率 | 课后补签 | 被发现后果 | 察觉人少时 |
|---------|---------|---------|---------|-----------|-----------|
| `easygoing-young.md` | 年轻好说话 | 偶尔，心血来潮 | 容易 | 理解，扣分少 | 可能点名 |
| `strict-old-school.md` | 顽固守旧 | 每周固定，雷打不动 | 绝不 | 直接扣平时分 | 不在乎人数 |
| `random-sampling.md` | 随机抽点（默认） | 随机，无固定规律 | 看情况 | 一般处理 | 点名概率升高 |
| `rollcall-every-time.md` | 每节必点 | 一直点名 | 无意义 | 必被抓 | 无影响 |
| `never-rollcall.md` | 从不点名 | 几乎不点 | 不适用 | 无风险 | 无影响 |

### 3.3 模板内容示例（`easygoing-young.md`）

```markdown
## 老师类别：年轻好说话型

### 行为特征
- 点名频率：偶尔，心血来潮式，没有固定周期
- 课后补签：比较容易，微信说一下就行
- 被发现逃课：能理解学生，扣分较少，一般口头提醒
- 人少反应：如果到课率明显低时会临时决定点名

### 对学生策略的影响
- 逃课被抓后主动联系可挽回
- 不需要特别规避，风险较低
- 但不要连续多周逃同一节课——容易引起注意
```

### 3.4 扩展机制

用户可在 Settings 页面自定义老师类别模板。存储在数据库或 `prompts/skills/teachers/custom-*.md`。

---

## 4. 通用点名 Skill

### 4.1 概念

描述所有随机点名场景下通用规律的启发式规则。作为 supervisor prompt 的 system 指令层注入。

### 4.2 存储

`prompts/skills/rollcall.md`

### 4.3 规则列表

| # | 观察 | 启发式规则 |
|---|------|-----------|
| 1 | 上次来了，本次不来的概率升高 | 学生上次到课，本次缺勤概率 +15%（心理：已去过了，这次可以歇） |
| 2 | 老师看到人少 → 点名 | 到课率低于平时 50%，点名概率 ×1.5 |
| 3 | 老师看到人多 → 不点名 | 到课率正常或偏高，点名概率 ×0.6 |
| 4 | 上次点名了，下次可能不点 | 上周点名，本周点名概率 ×0.5（教师心理：刚点过，缓缓） |
| 5 | 学期初/末点名密集 | week < 3 或 week > exam_week - 1 时，点名概率 ×1.3 |
| 6 | 学生连续缺勤 → 老师注意 | 同一学生连续 2 周逃课，点名概率 ×1.5（针对性抽点风险） |
| 7 | 学生连续到课 → 安全 | 同一学生连续 3 周到课，点名概率 ×0.7（建立好印象） |

### 4.4 注入方式

不是代码里的条件判断，而是作为 supervisor prompt 的一个 system 指令块：

```
## 通用点名规律（参考但不强制）

以下是在大量学生逃课数据中观察到的统计规律，供你决策时参考：

1. 学生上次到课，本次缺勤的概率比连续缺勤高约15%
2. 当到课率明显低于平时时，教师临时决定点名的概率显著升高
3. ...
```

---

## 5. 结构化事件记录（仅最近 2 周）

### 5.1 理由

- 点名规律变化快，老数据对当前决策参考价值极低
- supervisor 一周一跑，只需要最近 2 周的历史作为上下文
- 结构化字段让 prompt 拼装更精确

### 5.2 数据格式

使用已有的 `weekly_feedback` 表的 `actual_events` 字段，约定 JSON 结构：

```json
{
  "week": 11,
  "events": [
    {
      "date": "2026-05-11",
      "schedule_id": 401,
      "course_name": "数据结构",
      "planned_action": "逃课",
      "actual_action": "逃课",
      "was_caught": true,
      "caught_detail": "老师突然点名，班级群炸了赶过去的",
      "observed_attendance": "约40人/60人（偏少）",
      "rollcall_method_observed": "全员点名"
    }
  ]
}
```

### 5.3 查询逻辑

`prompt-builder.ts` 注入时只取 `week >= current_week - 2` 的事件。旧数据不删但也不读。

### 5.4 新增字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `date` | string (ISO) | ✅ | 具体日期 |
| `schedule_id` | number | ✅ | 关联课次 |
| `course_name` | string | ✅ | 课程名（冗余，方便 prompt 直接引用） |
| `planned_action` | enum | ✅ | 计划行动（上课/逃课/签退） |
| `actual_action` | enum | ✅ | 实际行为 |
| `was_caught` | boolean | ✅ | 是否被抓 |
| `caught_detail` | string | ❌ | 被抓详情（群通知、室友报信等） |
| `observed_attendance` | string | ❌ | 观察到的到课率 |
| `rollcall_method_observed` | string | ❌ | 实际使用的点名方式 |

---

## 6. Supervisor 改造

### 6.1 一次只生成一周

**当前模式**：一次性生成 4 周全部计划 → 课次多时 LLM 超时，rule-validator 全挂

**新模式**：

```
generateWeek(week=11, priorPlan=null)          → week 11 plan
  if rejected by user:
    generateWeek(week=11, feedback=user_input)  → 修改后的 week 11 plan
  if accepted:
    generateWeek(week=12, priorPlan=week11)     → week 12 plan（week11 当事实输入）
```

### 6.2 优势

| 维度 | 当前（全周一次） | 新模式（一周一次） |
|------|:---:|:---:|
| 每次 LLM 输出量 | 52 条 action（13课次×4周） | ~7 条 action |
| 超时风险 | 高（52 条 reasoning 超过 600s） | 低 |
| 被否定后代价 | 全部重跑 | 只重跑当前周 |
| 跨周延续性 | 无（每轮独立） | 有（priorPlan 当事实） |
| rule-validator 兼容 | 挂（规则按单周设计） | 通 |

### 6.3 API 设计

```typescript
// src/agents/supervisor.ts

interface GenerateWeekInput {
  week: number;
  priorPlan?: PlanAction[];       // 前一周已接受的计划，作为事实注入
  feedback?: string;              // 用户拒绝后的调整意见
}

interface GenerateWeekOutput {
  actions: PlanAction[];          // 本周的计划
  accepted: boolean;
}

export async function generateWeek(input: GenerateWeekInput): Promise<GenerateWeekOutput> {
  const ctx = buildWeekContext(input);
  const result = await generatePlan(buildSupervisorSystemPrompt(ctx), getAdaptiveTemperature(ctx));
  return { actions: result.actions, accepted: true };
}
```

### 6.4 模型选择

Supervisor **必须使用 SOTA 模型**（当前：`deepseek-v4-pro`）。Modeler 等其他 agent 使用廉价模型（`deepseek-v4-flash`）。

### 6.5 展开理由

当前输出 `reason` 是短字符串。升级为结构化对象：

```json
{
  "schedule_id": 401,
  "week": 11,
  "action": "逃课",
  "reason": "老师从不点名，风险极低",
  "reasoning": {
    "teacher_type": "easygoing-young",
    "rollcall_risk": "无风险",
    "decision_factors": [
      "点名频率：从不点名",
      "历史被抓：0次",
      "当前学生数：估计较多，不会引起注意"
    ],
    "contingency": "若突然点名，群消息通知后可从隔壁教室赶来（通勤成本低）"
  }
}
```

前端表格视图默认显示 `action` + `reason`（短文本）。点击展开查看 `reasoning.decision_factors` 和 `reasoning.contingency`。

---

## 7. 编排器（Orchestrator）瘦身

### 7.1 当前问题

Orchestrator 做了太多事：调 modeler → 调 rule engine → 调 Bayesian → 调 fusion → 调 supervisor → 写 DB。移除贝叶斯后可以大幅简化。

### 7.2 瘦身后的职责

```typescript
// 精简后的 orchestrator
export async function generateSession() {
  // 1. 拉数据（DB + MD files）
  const courses = dbMemory.getAllCourseSnapshots();
  const profile = dbProfile.ensureProfileExists();
  const config = dbProfile.ensureConfigExists();

  // 2. 拼 prompt（不调 LLM）
  const promptCtx = buildPlanContext(courses, profile, config);
  const systemPrompt = buildSupervisorSystemPrompt(promptCtx);

  // 3. 调 supervisor（唯一 LLM 调用）
  const plan = await generateWeek({ week: config.current_week });
  // 或：generateWithRetry(ctx)

  // 4. 写 DB
  db.transaction(() => {
    const sessionId = dbSessions.createSession(...);
    plan.actions.forEach(a => dbSessions.insertAction(a));
    for (const c of courses) dbMemory.updateCourseMemory(c.courseId);
  });
}
```

### 7.3 Modeler 降级

Modeler 不再调 LLM。降级为**纯 prompt 片段生成器**——负责把课程信息 + 老师 skill + 点名规则 + 事件记录拼成一段文本。

---

## 8. 动态 Prompt 拼装（8 Layers）

### 8.1 设计原则

- 每一层都是纯函数：输入 StructuredPlanContext，输出字符串
- 层之间用 XML 围栏标签隔离（`<layer-name>...</layer-name>`）
- 按条件选取内容，不用硬编码

### 8.2 层级结构

| Layer | 名称 | 内容来源 | 动态/静态 |
|:---:|------|---------|:---:|
| 1 | Agent Identity | 代码常量 | 静态 |
| 2 | Semester Context | `user_config` (周数、考试周) | 动态 |
| 3 | Course Memory | `course` + `course_schedule` (名字、时间) | 动态 |
| 4 | Teacher Skill | `prompts/skills/teachers/*.md`（按老师类型选） | 动态 |
| 5 | Rollcall Rules | `prompts/skills/rollcall.md` | 静态（内容可编辑） |
| 6 | Recent Events | `weekly_feedback`（最近 2 周结构化事件） | 动态 |
| 7 | Prior Plan | 前一周已接受的 plan_action（仅多周时注入） | 条件动态 |
| 8 | Output Format | 代码常量（JSON schema 描述） | 静态 |

### 8.3 示例组合

```
<agent-identity>
你是一个大学「排课主管」。你的职责是...
</agent-identity>

<semester-context>
当前第 11 周，共 16 周。考试周：第 16 周。非考试周，距离考试还有 5 周。
</semester-context>

<course-memory>
课程列表（共 8 门）：
- 【数据结构与算法】每周一午一、周三早一、周五早二（1-16周）| 点名：抽点/偶尔 | 被抓：0次
- 【大学物理】每周一早一、周四午一（1-16周）| 点名：位置签到/偶尔 | 被抓：0次
...
</course-memory>

<teacher-skill>
## 数据结构与算法 — 老师类型：年轻好说话
- 点名频率：偶尔，心血来潮
- 课后补签：容易
- 被发现：扣分少
...
</teacher-skill>

<rollcall-rules>
## 通用点名规律（参考但不强制）
1. 学生上次到课，本次缺勤概率+15%
2. 到课率明显低于平时 → 点名概率×1.5
...
</rollcall-rules>

<recent-events>
## 最近两周事件
第 10 周：
- 周一：数据结构 逃课 未被抓（到课率正常）
- 周三：大学物理 上课 —
第 11 周：（进行中）
...
</recent-events>

<prior-plan>
## 已生效的第 10 周计划（作为事实，不可修改）
- 周一早一 大学物理 → 上课
- 周三早一 数据结构 → 逃课
...
</prior-plan>

<output-format>
输出 JSON 格式...
</output-format>
```

---

## 9. 存储决策：DB vs MD

### 9.1 原则

- **DB**：结构化关联数据，需要查询/更新/事务
- **MD**：模板、prompt 片段、老师画像——LLM 直接读的文本

### 9.2 具体分配

| 数据 | 存储 | 理由 |
|------|------|------|
| 课程结构（课表） | DB | 关联查询（course ↔ schedule ↔ plan） |
| 用户画像 | DB | 单一记录，简单查询 |
| 老师 skill 模板 | `prompts/skills/teachers/*.md` | 文本模板，方便编辑和 Git 追踪 |
| 通用点名 skill | `prompts/skills/rollcall.md` | 同上 |
| 其他 prompt 模板 | `prompts/*.md` | 单独管理，代码里不硬拼 |
| 事件记录 | `weekly_feedback` 表 | 按周查询 |
| 生成的计划 | `plan_session` + `plan_action` | 需要关联 session ↔ action |
| 用户自定义老师模板 | DB 新表 `teacher_template` 或 MD | 待定，看是否需要前端编辑 UI |

### 9.3 LLM 不碰 SQL

整个链路中 LLM 只看见拼好的中文 prompt 文本，不写一行 SQL。所有 DB 读写由 TypeScript (`src/db/`) 完成。

---

## 10. 上下文管理：不压缩

### 10.1 理由

- 每次 supervisor 调用处理的 prompt 只有几百行（8 门课的上下文 + 规则）
- 不涉及长对话历史（不是对话 Agent）
- 每周反馈周期短，新数据进来老数据自然淘汰

### 10.2 结论

保留 `src/agents/compressor.ts` 和 `src/agents/curator.ts` 不动（不删已有代码），但**不新增压缩逻辑，不启用**。

---

## 11. Step3 课程三态标签

### 11.1 问题

用户可能提前导入整学期课表，但当前周之后才有新课开课。例如：
- 第 10 周生成计划（plan_weeks=1）
- 第 11 周开"软件工程"，第 12 周开"人工智能"
- 第 11 周的课需要填写信息出计划，第 12 周的课标记为"未知"跳过

### 11.2 三态定义

| 状态 | 条件 | 标签颜色 | Step3 行为 |
|------|------|:---:|------|
| **已开课** | `weeks[0] ≤ current_week` | 绿色 | 正常填写信息，进入方案 |
| **计划内待开课** | `current_week < weeks[0] ≤ current_week + plan_weeks` | 黄色"待开课" | 可填写信息，进入方案 |
| **计划外未开课** | `weeks[0] > current_week + plan_weeks` | 灰色"未知" | 跳过，不填信息，不计入方案 |

### 11.3 技术债追踪

`course` 表新增字段：

```sql
ALTER TABLE course ADD COLUMN info_status TEXT DEFAULT 'complete' CHECK (info_status IN ('complete', 'pending'));
```

- Step3 跳过 → `info_status = 'pending'`
- Step3 填写完整 → `info_status = 'complete'`
- 周反馈提交后 → 扫描 `info_status = 'pending' AND weeks[0] ≤ current_week(新)` → 弹窗提示

### 11.4 交互流程

```
用户提交周反馈
  │
  ├─ 检查 course 表：是否有 info_status='pending' 且 weeks[0] ≤ new_current_week 的课程？
  │
  ├─ 有 → 弹窗："上周'软件工程'已开课，但尚未填写课程信息。是否现在补充？"
  │        ├─ 是 → 跳转 Step3（预填已有信息，聚焦该课程）
  │        └─ 否 → 记录 tech-debt，下次反馈再提醒
  │
  └─ 无 → 正常完成反馈流程
```

---

## 12. 已删除/不再需要的模块

| 模块 | 状态 | 原因 |
|------|:---:|------|
| `src/agents/risk/bayesian-model.ts` | 移除 | 数据不足，统计无意义 |
| `src/agents/risk/rule-engine.ts` | 移除 | 改用 prompt 内规则 |
| `src/agents/risk/fusion-layer.ts` | 移除 | 贝叶斯层移除后无融合对象 |
| `src/agents/risk/index.ts` | 移除 | 同上 |
| `src/__tests__/agents/risk/` | 移除 | 对应测试 |
| `src/agents/modeler.ts` | 降级 | 不再调 LLM，改为 prompt 片段生成器 |
| `src/agents/modeler-pool.ts` | 降级 | 不再并行调 LLM，改为批量生成 prompt 片段 |
| `src/agents/compressor.ts` | 保留不动 | 不启用，但代码不删 |
| `src/agents/curator.ts` | 保留不动 | 同上 |
| `src/agents/pattern-learner.ts` | 保留不动 | 同上 |

---

## 13. 实施优先级

| 优先级 | 项目 | 改动量 | 依赖 |
|:---:|------|:---:|------|
| 🔴 P0 | 移除贝叶斯层 + 降级 Modeler | 中 | 无 |
| 🔴 P0 | Step3 课程三态标签 | 中 | 无 |
| 🔴 P0 | 结构化事件记录格式升级 | 小 | 无 |
| 🟡 P1 | Supervisor 一周一跑 | 大 | P0 完成 |
| 🟡 P1 | 老师类别 Skill 模板 | 中 | P0 完成 |
| 🟢 P2 | 通用点名 Skill 模板 | 小 | P0 完成 |
| 🟢 P2 | 展开理由（reasoning 对象） | 小 | P1 一周一跑 |
| 🟢 P2 | 多周延续（priorPlan） | 中 | P1 一周一跑 |
| 🟢 P3 | 用户自定义老师模板 | 大 | P1 模板框架 |
| 🟢 P3 | 技术债自动弹窗 | 中 | P0 三态标签 |

---

## 14. 已确认的模型分层配置

| Agent | 模型 | 用量限制 |
|-------|------|:---:|
| Supervisor | `deepseek-v4-pro` | 3,450 |
| Modeler | `deepseek-v4-flash` | 31,650 |
| Parser（视觉） | `qwen3.5-plus` | — |
| Memory / Compressor / Curator | `deepseek-v4-flash` | 31,650 |

配置方式：`.env.local` 中的 `{AGENT}_LLM_MODEL` 环境变量，`llm.ts` 中通过 `getAgentModel(circuitKey)` 解析。每个 agent 向 `chatCompletionJSON` 传 `circuitKey` 参数。

---

## 附录 A：改动清单（本次 merge-preview 会话已完成）

详见 `docs/active/logs/2026-05-08-merge-preview-session.md`。核心改动：

- 编译/类型/测试修复（19 个 bug）
- LLM 集成 + streaming + token 统计落地
- UX 修复（Step3 去重、Step1 周数可编辑）
- 离网测试工具链（种子脚本 + 生成脚本 + 场景脚本）
- Langfuse 浅接入 + 日志持久化
- prompt-builder 统一（移除 Layer 1/5/6 与 supervisor.md 重叠）
- 三层风险融合引擎集成（将在 v2 中移除）
- per-agent 模型分层配置
