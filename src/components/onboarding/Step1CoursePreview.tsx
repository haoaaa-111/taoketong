'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DAY_NAMES, PERIOD_SLOTS } from '@/types';

interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: string;
}

export default function Step1CoursePreview({
    courses,
    semesterStart,
    semesterEnd,
}: {
    courses: ParsedCourse[];
    semesterStart?: string;
    semesterEnd?: string;
}) {
    const router = useRouter();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [currentDayOfWeek, setCurrentDayOfWeek] = useState(new Date().getDay() || 7);

    const handleNext = () => {
        // 保存到 localStorage，供后续步骤使用
        const step1Data = {
            courses,
            semester_start: semesterStart,
            semester_end: semesterEnd,
            current_week: currentWeek,
            current_day_of_week: currentDayOfWeek,
        };
        localStorage.setItem('onboarding_step1', JSON.stringify(step1Data));
        router.push('/onboarding/step2');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="card">
                <h1 className="text-3xl font-bold mb-4">解析结果（共 {courses.length} 门课程）</h1>
                <p className="text-gray-400 mb-6">请确认解析的课程信息是否正确</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-gray-700">
                                <th className="pb-3 pr-4">课程名称</th>
                                <th className="pb-3 pr-4">地点</th>
                                <th className="pb-3 pr-4">老师</th>
                                <th className="pb-3 pr-4">学分</th>
                                <th className="pb-3 pr-4">上课时间</th>
                                <th className="pb-3 pr-4">周次</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            {courses.map((c, i) => (
                                <tr key={i} className="border-b border-gray-800">
                                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                                    <td className="py-3 pr-4">{c.location}</td>
                                    <td className="py-3 pr-4">{c.teacher_name || '-'}</td>
                                    <td className="py-3 pr-4">{c.credits ?? '-'}</td>
                                    <td className="py-3 pr-4">
                                        {DAY_NAMES[c.day_of_week - 1]} {c.period_slot}
                                    </td>
                                    <td className="py-3 pr-4">第 {c.weeks.join(', ')} 周</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h2 className="text-xl font-bold mb-4">学期信息</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">学期开始</label>
                        <input
                            type="date"
                            value={semesterStart || ''}
                            readOnly
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">学期结束</label>
                        <input
                            type="date"
                            value={semesterEnd || ''}
                            readOnly
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">当前第几周</label>
                        <input
                            type="number"
                            min={1}
                            max={25}
                            value={currentWeek}
                            onChange={(e) => setCurrentWeek(Number(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">今天是周几</label>
                        <select
                            value={currentDayOfWeek}
                            onChange={(e) => setCurrentDayOfWeek(Number(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        >
                            {DAY_NAMES.map((d, i) => (
                                <option key={i} value={i + 1}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleNext} className="btn btn-primary">
                    下一步：用户画像
                </button>
            </div>
        </div>
    );
}
