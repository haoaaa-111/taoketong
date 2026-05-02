# Session 08 — 前端：首页路由 + Onboarding Step 1（课表导入）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成前端首页（`/`）的路由逻辑和 Onboarding Step 1（课表图片上传 + 解析 + 学期信息填写）。

**Architecture:** 首页调用 `/api/init` 决定跳转到 onboarding 还是 schedule。Onboarding Step 1 实现图片上传、调用 `/api/parse-image`、显示解析预览、填写学期信息。

**Tech Stack:** Next.js App Router, React, TailwindCSS

**Source docs:**
- `dev-doc.md` Section 五(5.4 parse-image API)
- `design-spec.md` Section 五(5.1, 5.2 Step 1)
- `design-spec.md` 前端风格准则（简洁、深色、圆润、单向步进）

**前置依赖:** Session 04 (API routes), Session 03 (parse-image API)

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/app/page.tsx` | 创建 | 首页 — 判断跳转逻辑 |
| `src/app/onboarding/page.tsx` | 创建 | Onboarding 容器组件 |
| `src/app/onboarding/step1/page.tsx` | 创建 | Step 1: 课表导入 |
| `src/components/onboarding/Step1ImageUpload.tsx` | 创建 | 图片上传 + 解析组件 |
| `src/components/onboarding/Step1CoursePreview.tsx` | 创建 | 解析后课程预览表格 |

---

### Task 1: 首页路由逻辑

- [ ] **Step 1: 创建 `src/app/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface InitResponse {
    has_data: boolean;
    last_session?: any;
    last_actions?: any[];
}

export default function HomePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/init')
            .then(res => res.json())
            .then((data: InitResponse) => {
                if (data.has_data) {
                    router.push('/schedule');
                } else {
                    router.push('/onboarding');
                }
            })
            .catch(() => router.push('/onboarding'))
            .finally(() => setLoading(false));
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
                <div className="text-xl">加载中...</div>
            </div>
        );
    }

    return null;
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 2: Onboarding 容器

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/app/onboarding/step1 src/components/onboarding
```

- [ ] **Step 2: 创建 `src/app/onboarding/page.tsx`**

```tsx
'use client';

import { redirect } from 'next/navigation';

export default function OnboardingRoot() {
    redirect('/onboarding/step1');
}
```

---

### Task 3: Step 1 — 课表导入页面

- [ ] **Step 1: 创建 `src/components/onboarding/Step1ImageUpload.tsx`**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: string;
}

interface ParseResult {
    success: boolean;
    courses: ParsedCourse[];
    semester_start?: string;
    semester_end?: string;
}

export default function Step1ImageUpload({
    onParseComplete,
}: {
    onParseComplete: (result: ParseResult) => void;
}) {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = useCallback(async (file: File) => {
        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/parse-image', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (!data.success) {
                setError(data.message || '解析失败');
                return;
            }

            onParseComplete(data);
        } catch (e) {
            setError('网络请求失败');
        } finally {
            setUploading(false);
        }
    }, [onParseComplete]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleUpload(file);
        }
    }, [handleUpload]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    }, [handleUpload]);

    return (
        <div className="card max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">导入课表</h1>
            <p className="text-gray-400 mb-6">上传或粘贴你的课表截图，系统会自动解析</p>

            <label
                className="block border-2 border-dashed border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-gray-500 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
                {uploading ? (
                    <div className="text-gray-400">正在解析中...</div>
                ) : (
                    <div className="text-gray-400">
                        <div className="text-lg mb-2">📸 拖拽图片到这里，或点击上传</div>
                        <div className="text-sm">支持 PNG, JPG, WebP</div>
                    </div>
                )}
            </label>

            {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                    {error}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: 创建 `src/components/onboarding/Step1CoursePreview.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DAY_NAMES, PERIOD_SLOTS } from '@/types';

interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: string;
}

export default function Step1CoursePreview({
    courses,
    semesterStart,
    semesterEnd,
}: {
    courses: ParsedCourse[];
    semesterStart?: string;
    semesterEnd?: string;
}) {
    const router = useRouter();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [currentDayOfWeek, setCurrentDayOfWeek] = useState(new Date().getDay() || 7);

    const handleNext = () => {
        // 保存到 localStorage，供后续步骤使用
        const step1Data = {
            courses,
            semester_start: semesterStart,
            semester_end: semesterEnd,
            current_week: currentWeek,
            current_day_of_week: currentDayOfWeek,
        };
        localStorage.setItem('onboarding_step1', JSON.stringify(step1Data));
        router.push('/onboarding/step2');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="card">
                <h1 className="text-3xl font-bold mb-4">解析结果（共 {courses.length} 门课程）</h1>
                <p className="text-gray-400 mb-6">请确认解析的课程信息是否正确</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-gray-700">
                                <th className="pb-3 pr-4">课程名称</th>
                                <th className="pb-3 pr-4">地点</th>
                                <th className="pb-3 pr-4">老师</th>
                                <th className="pb-3 pr-4">学分</th>
                                <th className="pb-3 pr-4">上课时间</th>
                                <th className="pb-3 pr-4">周次</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            {courses.map((c, i) => (
                                <tr key={i} className="border-b border-gray-800">
                                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                                    <td className="py-3 pr-4">{c.location}</td>
                                    <td className="py-3 pr-4">{c.teacher_name || '-'}</td>
                                    <td className="py-3 pr-4">{c.credits ?? '-'}</td>
                                    <td className="py-3 pr-4">
                                        {DAY_NAMES[c.day_of_week - 1]} {c.period_slot}
                                    </td>
                                    <td className="py-3 pr-4">第 {c.weeks.join(', ')} 周</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h2 className="text-xl font-bold mb-4">学期信息</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">学期开始</label>
                        <input
                            type="date"
                            value={semesterStart || ''}
                            readOnly
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">学期结束</label>
                        <input
                            type="date"
                            value={semesterEnd || ''}
                            readOnly
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">当前第几周</label>
                        <input
                            type="number"
                            min={1}
                            max={25}
                            value={currentWeek}
                            onChange={(e) => setCurrentWeek(Number(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">今天是周几</label>
                        <select
                            value={currentDayOfWeek}
                            onChange={(e) => setCurrentDayOfWeek(Number(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        >
                            {DAY_NAMES.map((d, i) => (
                                <option key={i} value={i + 1}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleNext} className="btn btn-primary">
                    下一步：用户画像
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: 创建 `src/app/onboarding/step1/page.tsx` — 组装 Step 1**

```tsx
'use client';

import { useState } from 'react';
import Step1ImageUpload from '@/components/onboarding/Step1ImageUpload';
import Step1CoursePreview from '@/components/onboarding/Step1CoursePreview';

interface ParseResult {
    success: boolean;
    courses: any[];
    semester_start?: string;
    semester_end?: string;
}

export default function OnboardingStep1() {
    const [parsedData, setParsedData] = useState<ParseResult | null>(null);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
            {!parsedData ? (
                <Step1ImageUpload onParseComplete={setParsedData} />
            ) : (
                <Step1CoursePreview
                    courses={parsedData.courses}
                    semesterStart={parsedData.semester_start}
                    semesterEnd={parsedData.semester_end}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 4: LSP 诊断** — 零 error。

---

### Task 4: 验证 Session

- [ ] **Step 1: 文件结构确认**

```
src/
├── app/
│   ├── page.tsx              (new)
│   └── onboarding/
│       ├── page.tsx          (new)
│       └── step1/
│           └── page.tsx      (new)
└── components/
    └── onboarding/
        ├── Step1ImageUpload.tsx  (new)
        └── Step1CoursePreview.tsx (new)
```

- [ ] **Step 2: 视觉验证** — 运行 `npm run dev`，访问 `/` → 应该跳转到 `/onboarding/step1`，看到上传区域。
- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: 首页路由 + Onboarding Step 1（课表导入）"
```

---

> **下一 Session:** Session 09 — Onboarding Step 2（用户画像问卷）
