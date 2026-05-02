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
