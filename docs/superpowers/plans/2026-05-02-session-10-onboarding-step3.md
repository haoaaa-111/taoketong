# Session 10 — Onboarding Step 3（课程校对）+ 首次方案生成

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Onboarding Step 3（逐门课程校对 UI），完成后自动调用 `/api/session` 生成首份方案并跳转到 `/schedule`。

**Architecture:** 单页面，逐门显示解析的课程，提供表单编辑每门课程的属性（基调、点名方式、老师倾向等）。完成后批量存入数据库并触发方案生成。

**Tech Stack:** React, TailwindCSS, Next.js App Router

**Source docs:**
- `design-spec.md` Section 5.2 Step 3（课程校对）
- `design-spec.md` Section 二（Course 字段定义）, Section 七（枚举值）
- `dev-doc.md` Section 一(Course schema)

**前置依赖:** Session 09 (onboarding 流程), Session 04 (course CRUD API), Session 06 (session API)

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/app/onboarding/step3/page.tsx` | 创建 | Step 3 页面 + 课程校对表单 |
| `src/components/onboarding/CourseEditor.tsx` | 创建 | 单门课程编辑组件 |

---

### Task 1: CourseEditor 组件

- [ ] **Step 1: 创建 `src/components/onboarding/CourseEditor.tsx`**

```tsx
'use client';

import { COURSE_TYPES, STUDY_MODES, TEACHER_ATTITUDES, ESCAPE_DIFFICULTIES, ROLLCALL_METHODS, PERIOD_SLOTS, DAY_NAMES } from '@/types';

interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: string;
}

interface CourseFormData {
    course_type: string;
    study_mode: string;
    teacher_attitude: string;
    escape_difficulty: string;
    rollcall_methods: { method: string; frequency: string }[];
    catch_tolerance_per_class: number;
    max_catch_limit: number;
    exam_weeks: { mid?: number; final?: number };
    notes: string;
    schedules: { weeks: number[]; day_of_week: number; period_slot: string }[];
}

const DEFAULT_FORM: CourseFormData = {
    course_type: '不确定',
    study_mode: '自学',
    teacher_attitude: '不确定',
    escape_difficulty: '',
    rollcall_methods: [],
    catch_tolerance_per_class: 5,
    max_catch_limit: 3,
    exam_weeks: {},
    notes: '',
    schedules: [],
};

export default function CourseEditor({
    course,
    onChange,
}: {
    course: ParsedCourse & { tempId?: string };
    onChange: (data: CourseFormData) => void;
}) {
    const [form, setForm] = useState<CourseFormData>(DEFAULT_FORM);

    const update = (partial: Partial<CourseFormData>) => {
        const next = { ...form, ...partial };
        setForm(next);
        onChange(next);
    };

    const addRollcallMethod = () => {
        update({
            rollcall_methods: [...form.rollcall_methods, { method: '', frequency: '偶尔' }],
        });
    };

    const updateSchedule = (idx: number, field: string, value: any) => {
        const schedules = [...(form.schedules.length > 0 ? form.schedules : [{ weeks: course.weeks, day_of_week: course.day_of_week, period_slot: course.period_slot }])];
        schedules[idx] = { ...schedules[idx], [field]: value };
        update({ schedules });
    };

    const currentSchedules = form.schedules.length > 0 ? form.schedules : [{ weeks: course.weeks, day_of_week: course.day_of_week, period_slot: course.period_slot }];

    return (
        <div className="card space-y-6">
            <h2 className="text-xl font-bold">{course.name}</h2>
            <div className="text-sm text-gray-400">{course.location} · {DAY_NAMES[course.day_of_week - 1]} {course.period_slot}</div>

            {/* 课程基调 */}
            <div>
                <label className="text-gray-400 text-sm mb-1 block">课程基调</label>
                <select
                    value={form.course_type}
                    onChange={(e) => update({ course_type: e.target.value })}
                    className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                >
                    {COURSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {form.course_type === '水课' && <p className="text-xs text-yellow-500 mt-1">根据老师性格和考勤方差较大，不考虑在课上学习</p>}
                {form.course_type === '特殊课' && <p className="text-xs text-gray-500 mt-1">实验/体育类，辅助输入即可</p>}
            </div>

            {/* 专业课追加学习模式 */}
            {form.course_type === '专业课' && (
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">学习模式</label>
                    <div className="flex gap-3">
                        {STUDY_MODES.map(m => (
                            <button
                                key={m} type="button"
                                onClick={() => update({ study_mode: m })}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    form.study_mode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 老师倾向 */}
            <div>
                <label className="text-gray-400 text-sm mb-1 block">老师倾向</label>
                <select
                    value={form.teacher_attitude}
                    onChange={(e) => update({ teacher_attitude: e.target.value })}
                    className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                >
                    {TEACHER_ATTITUDES.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="">自定义...</option>
                </select>
            </div>

            {/* 地理环境 */}
            <div>
                <label className="text-gray-400 text-sm mb-1 block">地理环境</label>
                <div className="flex gap-3">
                    {ESCAPE_DIFFICULTIES.map(d => (
                        <button key={d} type="button" onClick={() => update({ escape_difficulty: d })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                form.escape_difficulty === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}>
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* 点名方式 */}
            <div>
                <label className="text-gray-400 text-sm mb-1 block">点名方式</label>
                {currentSchedules.map((s, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                        <select
                            value={form.rollcall_methods[idx]?.method || ''}
                            onChange={(e) => {
                                const methods = [...form.rollcall_methods];
                                methods[idx] = { ...methods[idx], method: e.target.value };
                                update({ rollcall_methods: methods });
                            }}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                        >
                            <option value="">选择...</option>
                            {ROLLCALL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                            value={form.rollcall_methods[idx]?.frequency || '偶尔'}
                            onChange={(e) => {
                                const methods = [...form.rollcall_methods];
                                methods[idx] = { ...methods[idx], frequency: e.target.value };
                                update({ rollcall_methods: methods });
                            }}
                            className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                        >
                            {['偶尔', '经常', '一直'].map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                ))}
                <button type="button" onClick={addRollcallMethod} className="text-sm text-blue-400 hover:text-blue-300">+ 添加点名方式</button>
            </div>

            {/* 被抓容忍度 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">可接受每几节被抓一次</label>
                    <input type="number" min={1} max={20} value={form.catch_tolerance_per_class}
                        onChange={(e) => update({ catch_tolerance_per_class: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                </div>
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">最多能被抓几次</label>
                    <input type="number" min={1} max={10} value={form.max_catch_limit}
                        onChange={(e) => update({ max_catch_limit: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                </div>
            </div>

            {/* 考试周 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">期中考试周</label>
                    <input type="number" min={1} max={20} value={form.exam_weeks.mid || ''}
                        onChange={(e) => update({ exam_weeks: { ...form.exam_weeks, mid: e.target.value ? Number(e.target.value) : undefined } })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="无" />
                </div>
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">期末考试周</label>
                    <input type="number" min={1} max={20} value={form.exam_weeks.final || ''}
                        onChange={(e) => update({ exam_weeks: { ...form.exam_weeks, final: e.target.value ? Number(e.target.value) : undefined } })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="无" />
                </div>
            </div>

            {/* 排期修正 */}
            <div>
                <label className="text-gray-400 text-sm mb-1 block">排期修正（Parser 未能识别的周次信息）</label>
                <input type="text" value={currentSchedules[0]?.weeks.join(',')}
                    onChange={(e) => {
                        const weeks = e.target.value.split(',').map(Number).filter(n => !isNaN(n));
                        updateSchedule(0, 'weeks', weeks);
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                    placeholder="如: 1,2,3,5,6,7" />
            </div>

            {/* 备注 */}
            <div>
                <label className="text-gray-400 text-sm mb-1 block">备注</label>
                <textarea
                    value={form.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 resize-none h-20"
                    placeholder="补充信息、手动修正等"
                />
            </div>
        </div>
    );
}
```

> **注意:** 需要加 `'use client'` 和 useState import — 记得在文件开头添加：
```tsx
'use client';
import { useState } from 'react';
```

---

### Task 2: Step 3 页面

- [ ] **Step 1: 创建 `src/app/onboarding/step3/page.tsx`**

```bash
mkdir -p src/app/onboarding/step3
```

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { COURSE_TYPES, STUDY_MODES, ESCAPE_DIFFICULTIES } from '@/types';
import CourseEditor from '@/components/onboarding/CourseEditor';

interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: string;
}

export default function OnboardingStep3() {
    const router = useRouter();
    const [courses, setCourses] = useState<ParsedCourse[]>([]);
    const [courseData, setCourseData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const step1Data = localStorage.getItem('onboarding_step1');
        if (!step1Data) {
            router.push('/onboarding/step1');
            return;
        }
        setCourses(JSON.parse(step1Data).courses);
    }, [router]);

    const handleCourseChange = (courseName: string, data: any) => {
        setCourseData(prev => ({ ...prev, [courseName]: data }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            // 批量保存课程
            for (const course of courses) {
                const data = courseData[course.name] || {};
                const rollcallMethods = data.rollcall_methods || [];
                const examWeeks = data.exam_weeks || {};

                // 创建课程
                const courseRes = await fetch('/api/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: course.name,
                        location: course.location,
                        teacher_name: course.teacher_name || null,
                        credits: course.credits || null,
                        course_type: data.course_type || '不确定',
                        study_mode: data.study_mode || '自学',
                        teacher_attitude: data.teacher_attitude || '不确定',
                        escape_difficulty: data.escape_difficulty || null,
                        rollcall_methods: JSON.stringify(rollcallMethods),
                        catch_tolerance_per_class: data.catch_tolerance_per_class ?? 5,
                        max_catch_limit: data.max_catch_limit ?? 3,
                        exam_weeks: Object.keys(examWeeks).length > 0 ? JSON.stringify(examWeeks) : null,
                        notes: data.notes || null,
                    }),
                });

                const courseResult = await courseRes.json();
                const courseId = courseResult.data?.id || courseResult.id;

                // 创建排期
                const schedules = data.schedules?.length > 0 ? data.schedules : [
                    { weeks: course.weeks, day_of_week: course.day_of_week, period_slot: course.period_slot }
                ];

                for (const schedule of schedules) {
                    await fetch('/api/courses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ schedule: true, course_id: courseId, weeks: schedule.weeks, day_of_week: schedule.day_of_week, period_slot: schedule.period_slot }),
                    });
                }
            }

            // 触发方案生成
            const sessionRes = await fetch('/api/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adjustment_notes: '首次方案生成' }),
            });

            if (sessionRes.ok) {
                localStorage.removeItem('onboarding_step1');
                localStorage.removeItem('onboarding_step2');
                router.push('/schedule');
            } else {
                const data = await sessionRes.json();
                setError(data.message || '方案生成失败');
            }
        } catch (e) {
            setError('网络错误: ' + (e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl font-bold mb-4">🤖 AI 正在生成方案...</div>
                    <div className="text-gray-400">这可能需要 30-60 秒，请耐心等待</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">课程校对</h1>
                    <p className="text-gray-400">请逐门确认课程信息，每门课程的详细信息影响后续方案质量</p>
                </div>

                {courses.map((course, i) => (
                    <CourseEditor
                        key={i}
                        course={course}
                        onChange={(data) => handleCourseChange(course.name, data)}
                    />
                ))}

                {error && (
                    <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                        {error}
                    </div>
                )}

                <div className="flex justify-end">
                    <button onClick={handleSubmit} className="btn btn-primary text-lg px-8 py-3">
                        完成校对并生成方案
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 3: 验证 Session

- [ ] **Step 1: LSP 诊断** 所有新文件零 error。
- [ ] **Step 2: 完整 onboarding 流程测试** — 从 `/` 开始，走完三步，最终到达 `/schedule`。
- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: Onboarding Step 3（课程校对）+ 首次方案生成"
```

---

> **Onboarding 流程全部完成！**
> **下一 Session:** Session 11 — Schedule 页面
