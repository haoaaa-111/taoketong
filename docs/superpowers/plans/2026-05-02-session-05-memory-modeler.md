# Session 05 — Memory Agent + Modeler Agent

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Memory Agent（记忆管理）和 Modeler Agent（风险建模），为方案生成阶段做准备。

**Architecture:** 两个独立的 Agent 模块，每个都有 prompt 文件 + 函数文件。Memory Agent 解析用户输入提取课程更新，Modeler Agent 对单门课程进行风险预测。

**Tech Stack:** openai (via llm.ts), fs (prompt files)

**Source docs:**
- `dev-doc.md` Section 四(4.1 memory.md, modeler.md; 4.2 memory.ts, modeler.ts)
- `design-spec.md` Section 4.2, 4.3

**前置依赖:** Session 03 (llm.ts + chatCompletionJSON)

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/agents/prompts/memory.md` | 创建 | Memory Agent prompt |
| `src/agents/prompts/modeler.md` | 创建 | Modeler Agent prompt |
| `src/agents/memory.ts` | 创建 | parseUserInput 函数 |
| `src/agents/modeler.ts` | 创建 | modelCourseRisk 函数 |

---

### Task 1: Memory Agent

- [ ] **Step 1: 创建 `src/agents/prompts/memory.md`**

```markdown
你是一个课程记忆管理助手。

## 任务
根据用户的输入，提取出与课程信息相关的更新内容，以 JSON 格式返回需要对课程做出的修改。

## 输入
用户可能输入以下内容：
- 课程信息校对
- 点名规则补充
- 老师性格描述
- 反馈事件（"上次被抓了"）
- 调整建议（"这课我不想上"）

## 输出格式

```json
{
    "updates": [
        {
            "course_name": "高等数学",
            "fields_to_update": {
                "teacher_attitude": "严抓",
                "rollcall_methods": [{"method": "抽点", "frequency": "经常"}],
                "notes": "第一次课强调了考勤"
            }
        }
    ],
    "message": "已更新2门课程的信息"
}
```

## 规则
- 只修改用户明确提及或暗示的课程
- 用户说"被抓了"意味着 current_caught_count +1
- 不确定就保留原来的值，不要覆盖
- 只输出 JSON
```

- [ ] **Step 2: 创建 `src/agents/memory.ts`**

```typescript
import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync(
    require.resolve('./prompts/memory.md'),
    'utf-8'
);

export async function parseUserInput(
    userInput: string
): Promise<{ updates: any[]; message: string }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: userInput,
    });
    return result;
}
```

- [ ] **Step 3: LSP 诊断** — 零 error。

---

### Task 2: Modeler Agent

- [ ] **Step 1: 创建 `src/agents/prompts/modeler.md`**

```markdown
你是一个点名规律建模助手。

## 任务
根据一门课程的完整信息（点名方式、频率、老师倾向、历史被抓记录、备注等），预测该课程的点名风险。

## 输入
课程信息快照（JSON 格式），包含：
- 课程基调（水课/专业课/特殊课）
- 点名方式及频率
- 老师倾向
- 地理环境
- 被抓历史
- 考试周信息
- 备注

## 输出格式

```json
{
    "risk_level": "低风险",
    "risk_reason": "老师偏懒，点名频率为偶尔抽点",
    "next_caught_probability": 0.15
}
```

## 输出要求
- risk_level: "无风险"/"低风险"/"中风险"/"高风险"
- risk_reason: 一句话解释，20字以内
- probability: 0-1 之间的小数
- 不要输出 CoT 推理过程，只出结论
- 只输出 JSON，不要有其他文字
```

- [ ] **Step 2: 创建 `src/agents/modeler.ts`**

```typescript
import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync(
    require.resolve('./prompts/modeler.md'),
    'utf-8'
);

export async function modelCourseRisk(
    courseSnapshot: string
): Promise<{ risk_level: string; risk_reason: string; next_caught_probability: number }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `课程信息：\n\n${courseSnapshot}`,
        temperature: 0.5,
    });
    return result;
}
```

- [ ] **Step 3: LSP 诊断** — 零 error。

---

### Task 3: 验证 Session

- [ ] **Step 1: LSP 诊断** 所有 4 个文件零 error。
- [ ] **Step 2: 文件结构确认**

```
src/agents/
├── parser.ts          (from Session 03)
├── memory.ts          (new)
├── modeler.ts         (new)
└── prompts/
    ├── parser.md      (from Session 03)
    ├── memory.md      (new)
    └── modeler.md     (new)
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: Memory Agent + Modeler Agent"
```

---

> **下一 Session:** Session 06 — Supervisor Agent + Orchestrator + `/api/session`
