'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import FeedbackActions from '@/components/schedule/FeedbackActions';
import WeeklyFeedback from '@/components/layout/WeeklyFeedback';

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
            </div>
        </div>
    );
}
