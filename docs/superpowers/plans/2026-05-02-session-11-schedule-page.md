# Session 11 — Schedule 课表展示页面

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 `/schedule` 课表展示页面，以周视图展示方案，支持周次切换和图例。

**Architecture:** 客户端组件。从 `/api/session/latest` 获取方案，从 `/api/courses` 获取课程详情。按周次和节次组织表格展示。

**Tech Stack:** React, TailwindCSS, Next.js App Router

**Source docs:**
- `design-spec.md` Section 5.3（课表展示）
- `design-spec.md` 前端风格准则（Gemini 风格、深色、圆润卡片）

**前置依赖:** Session 10 (完整数据流：课程存入 → 方案生成)

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/app/schedule/page.tsx` | 创建 | 课表展示主页面 |
| `src/components/schedule/ScheduleGrid.tsx` | 创建 | 课表网格组件 |
| `src/components/schedule/WeekNav.tsx` | 创建 | 周次导航组件 |

---

### Task 1: Schedule 主页面

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/app/schedule src/components/schedule
```

- [ ] **Step 2: 创建 `src/app/schedule/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import WeekNav from '@/components/schedule/WeekNav';
import { PERIOD_SLOTS, DAY_NAMES } from '@/types';

interface PlanAction {
    id: number;
    session_id: number;
    schedule_id: number;
    action: string;
    reason: string | null;
}

interface PlanSession {
    id: number;
    plan_start_date: string;
    plan_end_date: string;
    status: string;
    created_at: string;
}

interface Course {
    id: number;
    name: string;
    location: string | null;
    teacher_name: string | null;
    credits: number | null;
}

interface Schedule {
    id: number;
    course_id: number;
    weeks: number[];
    day_of_week: number;
    period_slot: string;
}

export default function SchedulePage() {
    const router = useRouter();
    const [session, setSession] = useState<PlanSession | null>(null);
    const [actions, setActions] = useState<PlanAction[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/init')
            .then(res => res.json())
            .then(data => {
                if (!data.has_data) router.push('/onboarding');
            });
    }, [router]);

    useEffect(() => {
        Promise.all([
            fetch('/api/session/latest').then(r => r.ok ? r.json() : null),
            fetch('/api/courses').then(r => r.json()),
        ])
            .then(([sessionData, coursesData]) => {
                if (sessionData) {
                    setSession(sessionData.session);
                    setActions(sessionData.actions);
                }
                if (coursesData?.courses) {
                    const allCourses: Course[] = [];
                    const allSchedules: Schedule[] = [];
                    for (const item of coursesData.courses) {
                        allCourses.push(item.course);
                        for (const s of item.schedules) {
                            allSchedules.push({ ...s, weeks: typeof s.weeks === 'string' ? JSON.parse(s.weeks) : s.weeks });
                        }
                    }
                    setCourses(allCourses);
                    setSchedules(allSchedules);
                }
            })
            .catch(() => setError('加载课表失败'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="text-xl">加载中...</div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
                <div className="max-w-4xl mx-auto card text-center">
                    <h1 className="text-2xl font-bold mb-4">暂无方案</h1>
                    <p className="text-gray-400 mb-6">还没有生成的方案，请先完成课表导入</p>
                    <button onClick={() => router.push('/onboarding')} className="btn btn-primary">
                        开始导入课表
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-center">本周方案</h1>

                <ScheduleGrid
                    actions={actions}
                    schedules={schedules}
                    courses={courses}
                />

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <span className="text-sm text-gray-400">图例：</span>
                    <span className="px-3 py-1 rounded-lg bg-green-600/20 text-green-400 text-sm font-medium border border-green-700">上课</span>
                    <span className="px-3 py-1 rounded-lg bg-red-600/20 text-red-400 text-sm font-medium border border-red-700">逃课</span>
                    <span className="px-3 py-1 rounded-lg bg-yellow-600/20 text-yellow-400 text-sm font-medium border border-yellow-700">签退</span>
                    <span className="px-3 py-1 rounded-lg bg-gray-700 text-gray-400 text-sm">— 空</span>
                </div>

                {/* 底部操作区 — Session 13 补充 */}
                <div className="mt-8 card flex flex-wrap justify-center gap-4">
                    <button className="btn btn-secondary">😤 不满意·打回重做</button>
                    <button className="btn btn-primary">✅ 接受方案</button>
                    <button className="btn btn-secondary">📢 补充情报</button>
                </div>
            </div>
        </div>
    );
}
```

---

### Task 2: ScheduleGrid 组件

- [ ] **Step 1: 创建 `src/components/schedule/ScheduleGrid.tsx`**

```tsx
'use client';

import { PERIOD_SLOTS } from '@/types';

interface Props {
    actions: any[];
    schedules: any[];
    courses: any[];
}

const ACTION_COLORS: Record<string, string> = {
    '上课': 'bg-green-600/20 text-green-400 border-green-700',
    '逃课': 'bg-red-600/20 text-red-400 border-red-700',
    '签退': 'bg-yellow-600/20 text-yellow-400 border-yellow-700',
};

export default function ScheduleGrid({ actions, schedules, courses }: Props) {
    // schedule_id → course map
    const scheduleMap = new Map<number, any>();
    const courseMap = new Map<number, any>();
    const actionMap = new Map<number, string>();

    courses.forEach(c => courseMap.set(c.id, c));
    schedules.forEach(s => scheduleMap.set(s.id, s));
    actions.forEach(a => actionMap.set(a.schedule_id, a.action));

    const rows: { period: string; cells: { day: number; courseName: string; action: string }[] }[] = [];

    for (const period of PERIOD_SLOTS) {
        const cells: { day: number; courseName: string; action: string }[] = [];
        for (let day = 1; day <= 5; day++) {
            // 查找该天和时段的排期
            const sched = schedules.find(s => s.day_of_week === day && s.period_slot === period);
            if (sched) {
                const course = courseMap.get(sched.course_id);
                const action = actionMap.get(sched.id) || '';
                cells.push({ day, courseName: course?.name || '', action });
            } else {
                cells.push({ day, courseName: '', action: '' });
            }
        }
        rows.push({ period, cells });
    }

    return (
        <div className="card overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-700">
                        <th className="p-3 text-left w-20 text-gray-400">时段</th>
                        {['周一', '周二', '周三', '周四', '周五'].map(d => (
                            <th key={d} className="p-3 text-center text-gray-400">{d}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-gray-800/50">
                            <td className="p-3 font-medium text-gray-300">{row.period}</td>
                            {row.cells.map((cell, ci) => (
                                <td key={ci} className="p-3">
                                    {cell.courseName ? (
                                        <div className={`text-center px-3 py-2 rounded-lg border ${cell.action ? ACTION_COLORS[cell.action] || 'bg-gray-700' : 'bg-gray-700 border-gray-600'}`}>
                                            <div className="font-medium">{cell.action || '—'}</div>
                                            <div className="text-xs text-gray-300 mt-1">{cell.courseName}</div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-600">—</div>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

---

### Task 3: 验证 Session

- [ ] **Step 1: LSP 诊断** 零 error。
- [ ] **Step 2: `npm run dev` 验证** — 完成 onboarding 后访问 `/schedule`，应该看到课表网格。
- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: Schedule 课表展示页面"
```

---

> **下一 Session:** Session 12 — Settings 页面 + UI 全局组件
