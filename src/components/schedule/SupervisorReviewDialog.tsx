'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface Question {
    id: string;
    text: string;
    context: string;
    type: 'choice' | 'open';
    options?: string[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    review: {
        assessment: string;
        questions: Question[];
    };
    reviewId: string;
    onComplete: (result: any) => void;
}

export default function SupervisorReviewDialog({ open, onClose, review, reviewId, onComplete }: Props) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const questions = review.questions;
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const currentAnswer = answers[currentQuestion?.id ?? ''] ?? '';

    const handleAnswer = (value: string) => {
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
        setError(null);
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex((i) => i + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((i) => i - 1);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        const answersArray = questions.map((q) => ({
            question_id: q.id,
            answer: answers[q.id] ?? '',
        }));

        try {
            const res = await fetch('/api/session/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    review_id: reviewId,
                    answers: answersArray,
                }),
            });

            const data = await res.json();
            if (data.success) {
                onComplete(data);
            } else {
                setError(data.message || '提交失败');
            }
        } catch {
            setError('网络错误');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/session/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    review_id: reviewId,
                    answers: [],
                }),
            });

            const data = await res.json();
            if (data.success) {
                onComplete(data);
            } else {
                setError(data.message || '跳过失败');
            }
        } catch {
            setError('网络错误');
        } finally {
            setSubmitting(false);
        }
    };

    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
    const isFirstQuestion = currentQuestionIndex === 0;
    const canProceed = currentAnswer.trim().length > 0;

    return (
        <Modal open={open} onClose={onClose} title="主管审核">
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 mb-4">
                <p className="text-gray-300 text-sm leading-relaxed">{review.assessment}</p>
            </div>

            <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-mono">
                    {currentQuestionIndex + 1}/{totalQuestions}
                </span>
                <div className="flex gap-1.5">
                    {questions.map((_, i) => (
                        <span
                            key={i}
                            className={`h-2 w-2 rounded-full transition-colors ${
                                i === currentQuestionIndex
                                    ? 'bg-blue-500'
                                    : answers[questions[i].id]
                                      ? 'bg-green-500'
                                      : 'bg-gray-600'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <p className="text-gray-100 font-medium mb-2">{currentQuestion.text}</p>
                {currentQuestion.context && (
                    <p className="text-gray-500 text-sm mb-3">{currentQuestion.context}</p>
                )}

                {currentQuestion.type === 'choice' && currentQuestion.options && (
                    <div className="flex flex-col gap-2">
                        {currentQuestion.options.map((option) => (
                            <button
                                key={option}
                                onClick={() => handleAnswer(option)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                                    currentAnswer === option
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}

                {currentQuestion.type === 'open' && (
                    <textarea
                        value={currentAnswer}
                        onChange={(e) => handleAnswer(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 h-24 resize-none"
                        placeholder="请输入你的回答..."
                    />
                )}
            </div>

            {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

            <div className="flex items-center justify-between gap-3">
                <button
                    onClick={handleSkip}
                    className="btn btn-secondary text-xs"
                    disabled={submitting}
                >
                    跳过，直接生成方案
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrev}
                        className="btn btn-secondary"
                        disabled={isFirstQuestion || submitting}
                    >
                        上一题
                    </button>
                    {isLastQuestion ? (
                        <button
                            onClick={handleSubmit}
                            className="btn btn-primary"
                            disabled={submitting || !canProceed}
                        >
                            {submitting ? '提交中...' : '提交'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="btn btn-primary"
                            disabled={submitting || !canProceed}
                        >
                            下一题
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
