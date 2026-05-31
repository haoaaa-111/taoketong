'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CourseEditor from '@/components/onboarding/CourseEditor';
import SupervisorReviewDialog from '@/components/schedule/SupervisorReviewDialog';

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
    const [reviewData, setReviewData] = useState<{ assessment: string; questions: any[] } | null>(null);
    const [reviewId, setReviewId] = useState<string | null>(null);

    useEffect(() => {
        const step1Data = localStorage.getItem('onboarding_step1');
        if (!step1Data) {
            router.push('/onboarding/step1');
            return;
        }
        const parsed = JSON.parse(step1Data);
        const rawCourses = parsed.courses;

        if (rawCourses[0]?.sessions) {
            const flat = rawCourses.flatMap((g: any) =>
                g.sessions.map((s: any) => ({
                    name: g.name,
                    location: s.location || '',
                    teacher_name: g.teacher_name,
                    credits: g.credits,
                    day_of_week: s.day_of_week,
                    period_slot: s.period_slot,
                    weeks: s.weeks,
                    sessionGroup: s.sessionGroup || 'default',
                }))
            );
            setCourses(flat);
        } else {
            setCourses(rawCourses);
        }
    }, [router]);

    const handleCourseChange = (courseName: string, data: any) => {
        setCourseData(prev => ({ ...prev, [courseName]: data }));
    };

    const handleReviewComplete = (result: any) => {
        if (result.status === 'ok' && result.session_id) {
            localStorage.removeItem('onboarding_step1');
            localStorage.removeItem('onboarding_step2');
            router.push('/schedule');
        } else {
            setError('方案生成失败');
            setReviewData(null);
            setReviewId(null);
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const nameSet = new Set(courses.map(c => c.name));

            for (const courseName of nameSet) {
                const courseEntries = courses.filter(c => c.name === courseName);
                const data = courseData[courseName] || {};
                const rollcallMethods = data.rollcall_methods || [];
                const examWeeks = data.exam_weeks || {};

                const courseRes = await fetch('/api/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: courseName,
                        location: courseEntries[0].location,
                        teacher_name: courseEntries[0].teacher_name || null,
                        credits: courseEntries[0].credits || null,
                        course_type: data.course_type || '不确定',
                        study_mode: data.study_mode || '自学',
                        teacher_attitude: data.teacher_attitude || '不确定',
                        escape_difficulty: data.escape_difficulty || null,
                        rollcall_methods: rollcallMethods,
                        catch_tolerance_per_class: data.catch_tolerance_per_class ?? 5,
                        max_catch_limit: data.max_catch_limit ?? 3,
                        exam_weeks: Object.keys(examWeeks).length > 0 ? examWeeks : null,
                        notes: data.notes || null,
                    }),
                });

                const courseResult = await courseRes.json();
                const courseId = courseResult.id;

                for (const course of courseEntries) {
                    const weeks = course.weeks || [1];
                    await fetch('/api/courses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ schedule: true, course_id: courseId, weeks, day_of_week: course.day_of_week, period_slot: course.period_slot }),
                    });
                }
            }

            const sessionRes = await fetch('/api/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adjustment_notes: '首次方案生成' }),
            });

            if (sessionRes.ok) {
                const data = await sessionRes.json();
                if (data.status === 'needs_review' && data.review) {
                    setReviewData(data.review);
                    setReviewId(data.review_id || null);
                    setLoading(false);
                    return;
                }
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

    if (loading && !reviewData) {
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

                {(() => {
                    const seen = new Set<string>();
                    return courses
                        .filter(c => seen.has(c.name) ? false : (seen.add(c.name), true))
                        .map(course => (
                            <CourseEditor
                                key={course.name}
                                course={course}
                                onChange={(data) => handleCourseChange(course.name, data)}
                            />
                        ));
                })()}

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

                {reviewData && reviewId && (
                    <SupervisorReviewDialog
                        open={true}
                        onClose={() => {
                            setReviewData(null);
                            setReviewId(null);
                        }}
                        review={reviewData}
                        reviewId={reviewId}
                        onComplete={handleReviewComplete}
                    />
                )}
            </div>
        </div>
    );
}
