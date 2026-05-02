# Session 03 — LLM 客户端 + Parser Agent + 课表解析 API

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 LLM 客户端封装、Parser Agent（含 prompt 文件）和课表图片解析 API `/api/parse-image`。

**Architecture:** LLM 客户端封装在 `src/lib/llm.ts`。Parser Agent 读取 prompt 文件并调用 LLM vision。API route 接收图片 formData，调用 Parser，返回 JSON。

**Tech Stack:** openai npm 包, Next.js API Routes

**Source docs:**
- `dev-doc.md` Section 三, 四(4.1 parser.md, 4.2 parser.ts), 五(5.4)
- `design-spec.md` Section 4.1

**前置依赖:** Session 02（types 需 `ParsedCourse`）

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/lib/llm.ts` | 创建 | LLM 客户端封装 + chatCompletion/chatCompletionJSON |
| `src/agents/prompts/parser.md` | 创建 | Parser Agent 系统 prompt |
| `src/agents/parser.ts` | 创建 | parseScheduleImage 函数 |
| `src/app/api/parse-image/route.ts` | 创建 | POST API — 图片解析 |

---

### Task 1: LLM 客户端封装

- [ ] **Step 1: 创建 `src/lib/llm.ts`**

```typescript
import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
    if (!client) {
        client = new OpenAI({
            apiKey: process.env.LLM_API_KEY,
            baseURL: process.env.LLM_BASE_URL,
        });
    }
    return client;
}

export interface ChatCompletionOptions {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    imageBase64?: string;
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const openai = getLLMClient();
    const model = options.model || process.env.LLM_MODEL || 'gpt-4o';

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: options.systemPrompt },
    ];

    if (options.imageBase64) {
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: options.userPrompt },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${options.imageBase64}` },
                },
            ],
        });
    } else {
        messages.push({ role: 'user', content: options.userPrompt });
    }

    const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
    });

    return response.choices[0]?.message?.content || '';
}

export async function chatCompletionJSON(
    options: ChatCompletionOptions,
    retries = 1
): Promise<Record<string, any>> {
    let lastError: Error | null = null;
    for (let i = 0; i <= retries; i++) {
        try {
            const content = await chatCompletion(options);
            const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1] || jsonMatch[0]);
            }
            return JSON.parse(content);
        } catch (e) {
            lastError = e as Error;
        }
    }
    throw new Error(`JSON解析失败: ${lastError?.message}`);
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 2: Parser Agent Prompt

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/agents/prompts
```

- [ ] **Step 2: 创建 `src/agents/prompts/parser.md`**

```markdown
你是一个专业的课表解析助手。

## 任务
分析用户提供的课程表图片，提取所有课程信息并输出为 JSON 格式。

## 输出格式

```json
{
    "courses": [
        {
            "name": "课程名称",
            "location": "上课地点",
            "teacher_name": "老师姓名（如果有的话）",
            "credits": 学分数字（如果有的话），
            "weeks": [1, 2, 3, 5, 6, 7],
            "day_of_week": 2,
            "period_slot": "早一"
        }
    ],
    "semester_start": "2026-09-01",
    "semester_end": "2027-01-15"
}
```

## time slot 映射
- 1-2 节 → "早一"
- 3-4 节 → "早二"
- 5-6 节 → "午一"
- 7-8 节 → "午二"
- 9-10 节或 9-11节 → "晚"

## 规则
- weeks 字段必须是整数数组
- day_of_week: 1=周一, 2=周二...7=周日
- 如果课表没有标明学期起止日，semester_start 和 semester_end 可以省略
- 无法识别的字段不要臆测，忽略即可
- 只输出 JSON，不要有其他文字
```

---

### Task 3: Parser Agent 函数

- [ ] **Step 1: 创建 `src/agents/parser.ts`**

```typescript
import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';

const SYSTEM_PROMPT = readFileSync(
    require.resolve('./prompts/parser.md'),
    'utf-8'
);

export async function parseScheduleImage(
    imageBase64: string
): Promise<{ courses: any[]; semester_start?: string; semester_end?: string }> {
    const result = await chatCompletionJSON({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: '请解析这张课表图片',
        imageBase64,
        temperature: 0.3,
    });

    return {
        courses: result.courses || [],
        semester_start: result.semester_start,
        semester_end: result.semester_end,
    };
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 4: `/api/parse-image` 路由

- [ ] **Step 1: 创建路由目录**

```bash
mkdir -p src/app/api/parse-image
```

- [ ] **Step 2: 创建 `src/app/api/parse-image/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/db/init';
import { parseScheduleImage } from '@/agents/parser';

ensureDatabaseReady();

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;
        if (!file) {
            return NextResponse.json(
                { success: false, message: '没有图片' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString('base64');

        const result = await parseScheduleImage(base64);

        return NextResponse.json({
            success: true,
            courses: result.courses,
            semester_start: result.semester_start,
            semester_end: result.semester_end,
        });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: (e as Error).message },
            { status: 500 }
        );
    }
}
```

- [ ] **Step 3: LSP 诊断** — 零 error。

---

### Task 5: 验证 Session

- [ ] **Step 1: LSP 诊断** 所有新文件零 error。
- [ ] **Step 2: 文件结构确认**

```
src/
├── lib/
│   └── llm.ts
├── agents/
│   ├── parser.ts
│   └── prompts/
│       └── parser.md
└── app/
    └── api/
        └── parse-image/
            └── route.ts
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: LLM 客户端 + Parser Agent + 课表解析 API"
```

---

> **下一 Session:** Session 04 — 基础设施 API（health, init, profile, config, courses CRUD）
