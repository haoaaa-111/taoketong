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
        } catch (e) {} finally {
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
