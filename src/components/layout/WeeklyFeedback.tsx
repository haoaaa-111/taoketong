'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface Props {
    open: boolean;
    onClose: () => void;
    sessionId: number;
    onSubmitSuccess?: () => void;
}

export default function WeeklyFeedback({ open, onClose, sessionId, onSubmitSuccess }: Props) {
    const [rating, setRating] = useState<number | null>(null);
    const [wasCaught, setWasCaught] = useState(false);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/feedback/weekly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    rating,
                    was_caught: wasCaught,
                    caught_courses: null,
                    actual_events: null,
                    memory_updates: null,
                    comment,
                }),
            });

            const data = await res.json();
            if (data.success && data.new_session_id) {
                setSuccess(true);
                setTimeout(() => {
                    onSubmitSuccess?.();
                    onClose();
                    setSuccess(false);
                    setRating(null);
                    setWasCaught(false);
                    setComment('');
                }, 2000);
            }
        } catch (e) {
            // handle error
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="本周实践反馈">
            <div className="space-y-4">
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">本周方案满意度（1-10）</label>
                    <div className="flex gap-1">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setRating(n)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                                    rating === n ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">本周被抓了一次</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={wasCaught}
                            onChange={(e) => setWasCaught(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div>
                    <label className="text-gray-400 text-sm mb-1 block">备注</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 h-20 resize-none"
                        placeholder="本周实际情况..."
                    />
                </div>

                {success && <div className="text-green-400 text-sm">✅ 反馈已提交，正在生成下周方案...</div>}

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary" disabled={submitting}>跳过</button>
                    <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                        {submitting ? '提交中...' : '提交并生成下周方案'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
