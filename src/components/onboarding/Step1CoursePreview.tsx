'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DAY_NAMES, ParsedCourseGroup, CourseGroup, SessionEntry } from '@/types';
import ScrollPicker from '@/components/ui/ScrollPicker';
import Step1CourseGroup from '@/components/onboarding/Step1CourseGroup';
import Modal from '@/components/ui/Modal';

function toCourseGroup(parsed: ParsedCourseGroup): CourseGroup {
    return {
        name: parsed.name,
        teacher_name: parsed.teacher_name,
        credits: parsed.credits,
        sessions: parsed.sessions.map((s, idx) => ({
            id: `${parsed.name}-${s.day_of_week}-${s.period_slot}-${idx}`,
            day_of_week: s.day_of_week,
            period_slot: s.period_slot,
            weeks: s.weeks,
            location: s.location,
            sessionGroup: 'default',
        })),
    };
}

export default function Step1CoursePreview({
    courses,
    semesterStart,
    semesterEnd,
}: {
    courses: ParsedCourseGroup[];
    semesterStart?: string;
    semesterEnd?: string;
}) {
    const router = useRouter();
    const today = new Date().toISOString().split('T')[0].slice(0, 7);

    const [groups, setGroups] = useState<CourseGroup[]>(courses.map(toCourseGroup));
    const [startDate, setStartDate] = useState(semesterStart?.slice(0, 7) || today);
    const [endDate, setEndDate] = useState(semesterEnd?.slice(0, 7) || '');
    const [currentWeek, setCurrentWeek] = useState(1);
    const [currentDayOfWeek, setCurrentDayOfWeek] = useState(new Date().getDay() || 7);
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [newCourse, setNewCourse] = useState({ name: '', weekDays: '', periodSlot: '早一' as const, weeks: '' });

    const [customSessionTypes, setCustomSessionTypes] = useState<Set<string>>(new Set());

    const sessionGroups = useMemo(() => {
        const allGroups = new Set<string>(['default', ...customSessionTypes]);
        for (const g of groups) {
            for (const s of g.sessions) {
                allGroups.add(s.sessionGroup);
            }
        }
        return Array.from(allGroups);
    }, [groups, customSessionTypes]);

    const updateGroup = (name: string, updated: CourseGroup) => {
        setGroups(prev => prev.map(g => g.name === name ? updated : g));
    };

    const deleteGroup = (name: string) => {
        setGroups(prev => prev.filter(g => g.name !== name));
    };

    const addSessionGroup = (_courseName: string, typeName: string) => {
        setCustomSessionTypes(prev => {
            const next = new Set(prev);
            next.add(typeName);
            return next;
        });
    };

    const handleAddCourse = () => {
        if (!newCourse.name.trim()) return;
        const weekDays = newCourse.weekDays.split(/[，,、]/).map(Number).filter(n => n >= 1 && n <= 7);
        const weeks = newCourse.weeks.split(/[，,、]/).map(Number).filter(n => n > 0);

        const sessions: SessionEntry[] = weekDays.map(d => ({
            id: `${newCourse.name}-${d}-${newCourse.periodSlot}-manual`,
            day_of_week: d,
            period_slot: newCourse.periodSlot,
            weeks,
            sessionGroup: 'default',
        }));

        if (sessions.length === 0) {
            sessions.push({
                id: `${newCourse.name}-1-${newCourse.periodSlot}-manual`,
                day_of_week: 1,
                period_slot: newCourse.periodSlot,
                weeks,
                sessionGroup: 'default',
            });
        }

        setGroups(prev => [...prev, { name: newCourse.name.trim(), sessions }]);
        setShowAddCourse(false);
        setNewCourse({ name: '', weekDays: '', periodSlot: '早一', weeks: '' });
    };

    const handleNext = () => {
        const step1Data = {
            courses: groups.map(g => ({
                name: g.name,
                teacher_name: g.teacher_name,
                credits: g.credits,
                sessions: g.sessions.map(s => ({
                    day_of_week: s.day_of_week,
                    period_slot: s.period_slot,
                    weeks: s.weeks,
                    location: s.location,
                    sessionGroup: s.sessionGroup,
                })),
            })),
            semester_start: startDate ? `${startDate}-01` : null,
            semester_end: endDate ? `${endDate}-01` : null,
            current_week: currentWeek,
            current_day_of_week: currentDayOfWeek,
        };
        localStorage.setItem('onboarding_step1', JSON.stringify(step1Data));

        const flatCourses = groups.flatMap(g =>
            g.sessions.map(s => ({
                name: g.name,
                location: s.location || '',
                teacher_name: g.teacher_name,
                credits: g.credits,
                day_of_week: s.day_of_week,
                period_slot: s.period_slot,
                weeks: s.weeks,
            }))
        );

        localStorage.setItem('onboarding_step1_flattened', JSON.stringify({
            ...step1Data,
            courses: flatCourses,
        }));

        router.push('/onboarding/step2');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="card">
                <h1 className="text-2xl font-bold mb-2">解析结果（共 {groups.length} 门课程）</h1>
                <p className="text-gray-400 text-sm">课程按名称合并，展开后可将课次标记为特殊课次。双击可编辑课程名、老师、学分。</p>
            </div>

            {groups.map(g => (
                <Step1CourseGroup
                    key={g.name}
                    group={g}
                    sessionGroups={sessionGroups}
                    onGroupChange={(updated) => updateGroup(g.name, updated)}
                    onAddSessionGroup={(name) => addSessionGroup(g.name, name)}
                    onDelete={() => deleteGroup(g.name)}
                />
            ))}

            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">学期信息</h2>
                    <button
                        type="button"
                        onClick={() => setShowAddCourse(true)}
                        className="btn btn-primary text-sm"
                    >
                        + 新增课程
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block flex items-center gap-1">
                            学期开始 <span className="text-xs text-gray-500">（滚轮选年月）</span>
                        </label>
                        <ScrollPicker value={startDate} onChange={setStartDate} />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block flex items-center gap-1">
                            学期结束 <span className="text-xs text-gray-500">（滚轮选年月）</span>
                        </label>
                        <ScrollPicker value={endDate} onChange={setEndDate} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">当前第几周</label>
                        <input
                            type="number" min={1} max={25}
                            value={currentWeek}
                            onChange={(e) => setCurrentWeek(Math.max(1, Number(e.target.value)))}
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

            <Modal open={showAddCourse} onClose={() => setShowAddCourse(false)} title="新增课程">
                <div className="space-y-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">课程名称</label>
                        <input
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                            placeholder="如：高等数学"
                            value={newCourse.name}
                            onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">周几上课（如 1,3,5）</label>
                        <input
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                            placeholder="如 1,3,5"
                            value={newCourse.weekDays}
                            onChange={(e) => setNewCourse(prev => ({ ...prev, weekDays: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">时段</label>
                        <select
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                            value={newCourse.periodSlot}
                            onChange={(e) => setNewCourse(prev => ({ ...prev, periodSlot: e.target.value as typeof newCourse.periodSlot }))}
                        >
                            {['早一', '早二', '午一', '午二', '晚'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">周次范围（如 1,2,3-16）</label>
                        <input
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                            placeholder="如 1,2,3,4,5,6,7,8"
                            value={newCourse.weeks}
                            onChange={(e) => setNewCourse(prev => ({ ...prev, weeks: e.target.value }))}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddCourse(false)}>取消</button>
                        <button type="button" className="btn btn-primary" onClick={handleAddCourse}>添加</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
