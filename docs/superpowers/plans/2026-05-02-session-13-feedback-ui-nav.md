# Session 13 — 反馈闭环 UI + 全局导航

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers/executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成课表页面底部的反馈操作（打回重做、接受方案、补充情报），实现弹窗式反馈表单和导航栏。

**Architecture:** Schedule 页面的底部操作按钮触发弹窗，弹窗提交后调用相应的反馈 API。导航栏提供全局页面间跳转。

**Tech Stack:** React, TailwindCSS, Next.js App Router

**Source docs:**
- `design-spec.md` Section 5.3（即时反馈 + 周后反馈）
- `dev-doc.md` Section 五(5.9, 5.10)

**前置依赖:** Session 07 (feedback APIs), Session 11 (schedule page), Session 12 (Modal component)

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/schedule/FeedbackActions.tsx` | 创建 | 底部反馈操作栏 |
| `src/components/schedule/RejectDialog.tsx` | 创建 | 打回重做弹窗 |
| `src/components/schedule/IntelDialog.tsx` | 创建 | 补充情报弹窗 |
| `src/components/layout/Navbar.tsx` | 创建 | 全局导航栏 |
| `src/components/layout/WeeklyFeedback.tsx` | 创建 | 周后反馈表单 |
| `src/app/schedule/page.tsx` | 修改 | 集成反馈组件 |

---

### Task 1: 导航栏

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/components/layout
```

- [ ] **Step 2: 创建 `src/components/layout/Navbar.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();
    const isOnboarding = pathname?.startsWith('/onboarding');

    if (isOnboarding) return null;

    return (
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold tracking-tight hover:text-blue-400 transition-colors">
                    逃课通
                </Link>
                <div className="flex gap-4 text-sm">
                    <NavLink href="/schedule" active={pathname === '/schedule'}>课表</NavLink>
                    <NavLink href="/settings" active={pathname === '/settings'}>设置</NavLink>
                </div>
            </div>
        </nav>
    );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link href={href} className={`px-3 py-1.5 rounded-lg transition-colors ${active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>
            {children}
        </Link>
    );
}
```

- [ ] **Step 3: 修改 `src/app/layout.tsx`** 集成导航栏

在 layout.tsx 的 body 中添加 Navbar：

```tsx
import { Navbar } from '@/components/layout/Navbar';

// body 内改为：
<body className="min-h-screen bg-gray-950 text-gray-100">
    <Navbar />
    {children}
</body>
```

---

### Task 2: 打回重做弹窗

- [ ] **Step 1: 创建 `src/components/schedule/RejectDialog.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface Props {
    open: boolean;
    onClose: () => void;
    sessionId: number;
    onSuccess: (result: any) => void;
}

export default function RejectDialog({ open, onClose, sessionId, onSuccess }: Props) {
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/feedback/immediate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    decision: 'rejected',
                    adjustment_notes: notes,
                }),
            });

            const data = await res.json();
            if (data.success) {
                onSuccess(data);
            } else {
                setError(data.message || '打回失败');
            }
        } catch (e) {
            setError('网络错误');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="打回重做">
            <p className="text-gray-400 text-sm mb-4">告诉 AI 你哪里不满意，它会重新生成方案</p>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 h-24 resize-none mb-4"
                placeholder="例如：高数课建议逃课而不是上课..."
            />
            {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
            <div className="flex justify-end gap-3">
                <button onClick={onClose} className="btn btn-secondary" disabled={submitting}>取消</button>
                <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting || !notes.trim()}>
                    {submitting ? '生成中...' : '提交'}
                </button>
            </div>
        </Modal>
    );
}
```

---

### Task 3: 补充情报弹窗

- [ ] **Step 1: 创建 `src/components/schedule/IntelDialog.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface Props {
    open: boolean;
    onClose: () => void;
    sessionId: number;
}

export default function IntelDialog({ open, onClose, sessionId }: Props) {
    const [intel, setIntel] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await fetch('/api/feedback/immediate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    decision: 'accepted',
                    adjustment_notes: intel,
                }),
            });
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
                setIntel('');
            }, 1500);
        } catch (e) {
            // handle error
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="补充情报">
            <p className="text-gray-400 text-sm mb-4">有什么新情况？AI 会记住这些信息。</p>
            <textarea
                value={intel}
                onChange={(e) => setIntel(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 h-24 resize-none mb-4"
                placeholder="例如：高数老师上周临时调课了..."
            />
            {success && <div className="text-green-400 text-sm mb-3">✅ 情报已记录</div>}
            <div className="flex justify-end gap-3">
                <button onClick={onClose} className="btn btn-secondary" disabled={submitting}>关闭</button>
                <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting || !intel.trim()}>
                    {submitting ? '提交中...' : '提交'}
                </button>
            </div>
        </Modal>
    );
}
```

---

### Task 4: FeedbackActions 组件 + 集成到 Schedule 页面

- [ ] **Step 1: 创建 `src/components/schedule/FeedbackActions.tsx`**

```tsx
'use client';

import { useState } from 'react';
import RejectDialog from './RejectDialog';
import IntelDialog from './IntelDialog';

interface Props {
    sessionId: number;
    onRegenerate: (result: any) => void;
    onAccept?: () => void;
}

export default function FeedbackActions({ sessionId, onRegenerate, onAccept }: Props) {
    const [rejectOpen, setRejectOpen] = useState(false);
    const [intelOpen, setIntelOpen] = useState(false);

    const handleAccept = async () => {
        await fetch('/api/feedback/immediate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                decision: 'accepted',
                adjustment_notes: null,
            }),
        });
        onAccept?.();
    };

    return (
        <>
            <div className="mt-8 card flex flex-wrap justify-center gap-4">
                <button onClick={() => setRejectOpen(true)} className="btn btn-secondary">
                    😤 不满意·打回重做
                </button>
                <button onClick={handleAccept} className="btn btn-primary">
                    ✅ 接受方案
                </button>
                <button onClick={() => setIntelOpen(true)} className="btn btn-secondary">
                    📢 补充情报
                </button>
            </div>

            <RejectDialog
                open={rejectOpen}
                onClose={() => setRejectOpen(false)}
                sessionId={sessionId}
                onSuccess={onRegenerate}
            />
            <IntelDialog
                open={intelOpen}
                onClose={() => setIntelOpen(false)}
                sessionId={sessionId}
            />
        </>
    );
}
```

- [ ] **Step 2: 修改 `src/app/schedule/page.tsx`** — 集成反馈组件

将底部的硬编码按钮替换为 `<FeedbackActions>` 组件：

```tsx
import FeedbackActions from '@/components/schedule/FeedbackActions';
// ... 在 JSX 中替换底部操作区:
{session && (
    <FeedbackActions
        sessionId={session.id}
        onRegenerate={(result) => {
            if (result.new_actions) {
                setActions(result.new_actions);
                setSession({ ...session, id: result.new_session_id });
            } else {
                window.location.reload();
            }
        }}
        onAccept={() => {
            window.location.reload();
        }}
    />
)}
```

- [ ] **Step 3: LSP 诊断** — 零 error。

---

### Task 5: 验证 Session

- [ ] **Step 1: LSP 诊断** 所有文件零 error。
- [ ] **Step 2: 流程测试** — 在课表页面测试三个反馈按钮，确认弹窗、提交、刷新行为正确。
- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: 反馈闭环 UI + 全局导航栏"
```

---

> **下一 Session:** Session 14 — 最终抛光 + README + 验收
