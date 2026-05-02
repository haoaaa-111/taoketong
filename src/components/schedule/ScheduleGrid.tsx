'use client';

import { PERIOD_SLOTS } from '@/types';

interface Props {
    actions: any[];
    schedules: any[];
    courses: any[];
}

const ACTION_COLORS: Record<string, string> = {
    '上课': 'bg-green-600/20 text-green-400 border-green-700',
    '逃课': 'bg-red-600/20 text-red-400 border-red-700',
    '签退': 'bg-yellow-600/20 text-yellow-400 border-yellow-700',
};

export default function ScheduleGrid({ actions, schedules, courses }: Props) {
    const scheduleMap = new Map<number, any>();
    const courseMap = new Map<number, any>();
    const actionMap = new Map<number, string>();

    courses.forEach(c => courseMap.set(c.id, c));
    schedules.forEach(s => scheduleMap.set(s.id, s));
    actions.forEach(a => actionMap.set(a.schedule_id, a.action));

    const rows: { period: string; cells: { day: number; courseName: string; action: string }[] }[] = [];

    for (const period of PERIOD_SLOTS) {
        const cells: { day: number; courseName: string; action: string }[] = [];
        for (let day = 1; day <= 5; day++) {
            const sched = schedules.find(s => s.day_of_week === day && s.period_slot === period);
            if (sched) {
                const course = courseMap.get(sched.course_id);
                const action = actionMap.get(sched.id) || '';
                cells.push({ day, courseName: course?.name || '', action });
            } else {
                cells.push({ day, courseName: '', action: '' });
            }
        }
        rows.push({ period, cells });
    }

    return (
        <div className="card overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-700">
                        <th className="p-3 text-left w-20 text-gray-400">时段</th>
                        {['周一', '周二', '周三', '周四', '周五'].map(d => (
                            <th key={d} className="p-3 text-center text-gray-400">{d}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-gray-800/50">
                            <td className="p-3 font-medium text-gray-300">{row.period}</td>
                            {row.cells.map((cell, ci) => (
                                <td key={ci} className="p-3">
                                    {cell.courseName ? (
                                        <div className={`text-center px-3 py-2 rounded-lg border ${cell.action ? ACTION_COLORS[cell.action] || 'bg-gray-700' : 'bg-gray-700 border-gray-600'}`}>
                                            <div className="font-medium">{cell.action || '—'}</div>
                                            <div className="text-xs text-gray-300 mt-1">{cell.courseName}</div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-600">—</div>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
