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
