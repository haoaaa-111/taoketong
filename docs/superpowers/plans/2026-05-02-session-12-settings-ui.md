# Session 12 — Settings 页面 + UI 全局组件

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成设置页面（学期时间、导出数据、重置数据）和通用 UI 组件。

**Architecture:** 设置页面通过 API 管理配置。导出功能将全部数据序列化为 JSON 下载。重置功能清空数据库。

**Tech Stack:** React, TailwindCSS, Next.js App Router

**Source docs:**
- `design-spec.md` Section 5.4（设置页）

**前置依赖:** Session 04 (config/profile API)

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/app/settings/page.tsx` | 创建 | 设置页面 |
| `src/components/ui/Modal.tsx` | 创建 | 确认弹窗组件 |
| `tailwind.config.ts` | 修改 | 完善 Tailwind 配置 |

---

### Task 1: Settings 页面

- [ ] **Step 1: 创建目录 + `src/app/settings/page.tsx`**

```bash
mkdir -p src/app/settings
```

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DAY_NAMES } from '@/types';

interface Config {
    id: number;
    semester_start_date: string | null;
    semester_end_date: string | null;
    current_week: number | null;
    current_day_of_week: number | null;
}

interface Profile {
    id: number;
    has_completed_onboarding: boolean;
}

export default function SettingsPage() {
    const [config, setConfig] = useState<Config | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/config').then(r => r.json()),
            fetch('/api/profile').then(r => r.json()),
        ]).then(([c, p]) => {
            setConfig(c);
            setProfile(p);
        });
    }, []);

    const saveConfig = useCallback(async (updates: Partial<Config>) => {
        setSaving(true);
        await fetch('/api/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        setSaving(false);
        window.location.reload();
    }, []);

    const handleExport = useCallback(async () => {
        try {
            const [coursesRes, profileRes, configRes] = await Promise.all([
                fetch('/api/courses'),
                fetch('/api/profile'),
                fetch('/api/config'),
            ]);
            const [courses, profile, config] = await Promise.all([
                coursesRes.json(),
                profileRes.json(),
                configRes.json(),
            ]);

            const data = { courses, profile, config, export_date: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `skipclass-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('导出失败');
        }
    }, []);

    const handleReset = useCallback(async () => {
        // 重置为初始状态，清除 localStorage 和跳转
        localStorage.clear();
        window.location.href = '/onboarding';
    }, []);

    if (!config || !profile) {
        return <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">加载中...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold">设置</h1>

                {/* 学期信息 */}
                <div className="card space-y-4">
                    <h2 className="text-xl font-bold">学期信息</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">学期开始</label>
                            <input type="date" value={config.semester_start_date || ''}
                                onChange={(e) => saveConfig({ semester_start_date: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">学期结束</label>
                            <input type="date" value={config.semester_end_date || ''}
                                onChange={(e) => saveConfig({ semester_end_date: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">当前第几周</label>
                            <input type="number" min={1} max={25} value={config.current_week || 1}
                                onChange={(e) => saveConfig({ current_week: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">今天是周几</label>
                            <select value={config.current_day_of_week || 1}
                                onChange={(e) => saveConfig({ current_day_of_week: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                                {DAY_NAMES.map((d, i) => <option key={i} value={i + 1}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 数据管理 */}
                <div className="card space-y-4">
                    <h2 className="text-xl font-bold">数据管理</h2>
                    <div className="flex gap-4">
                        <button onClick={handleExport} className="btn btn-secondary">📦 导出数据（JSON）</button>
                        <button onClick={() => setConfirmReset(true)} className="btn btn-primary bg-red-600 hover:bg-red-500">🗑️ 重置所有数据</button>
                    </div>
                </div>

                {/* 重置确认 Modal */}
                {confirmReset && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="card max-w-sm w-full mx-4 text-center">
                            <h3 className="text-lg font-bold mb-2">确认重置</h3>
                            <p className="text-gray-400 text-sm mb-6">所有数据将被清除，此操作不可恢复。</p>
                            <div className="flex gap-4 justify-center">
                                <button onClick={() => setConfirmReset(false)} className="btn btn-secondary">取消</button>
                                <button onClick={handleReset} className="btn btn-primary bg-red-600 hover:bg-red-500">确认重置</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 2: Modal 组件

- [ ] **Step 1: 创建 `src/components/ui/Modal.tsx`**

```tsx
'use client';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="card max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: LSP 诊断** — 零 error。

---

### Task 3: 验证 Session

- [ ] **Step 1: LSP 诊断** 零 error。
- [ ] **Step 2: `npm run dev` 验证** — 访问 `/settings`，测试学期时间修改、导出数据功能。
- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: Settings 页面 + Modal 组件"
```

---

> **下一 Session:** Session 13 — 反馈 UI + 导航栏 + 全局优化
