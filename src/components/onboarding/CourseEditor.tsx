'use client';

import { useState } from 'react';
import { COURSE_TYPES, STUDY_MODES, TEACHER_ATTITUDES, ESCAPE_DIFFICULTIES, ROLLCALL_METHODS, PERIOD_SLOTS, DAY_NAMES } from '@/types';

interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: string;
}

interface CourseFormData {
    course_type: string;
    study_mode: string;
    teacher_attitude: string;
    escape_difficulty: string;
    rollcall_methods: { method: string; frequency: string }[];
    catch_tolerance_per_class: number;
    max_catch_limit: number;
    exam_weeks: { mid?: number; final?: number };
    notes: string;
    schedules: { weeks: number[]; day_of_week: number; period_slot: string }[];
}

const DEFAULT_FORM: CourseFormData = {
    course_type: '不确定',
    study_mode: '自学',
    teacher_attitude: '不确定',
    escape_difficulty: '',
    rollcall_methods: [],
    catch_tolerance_per_class: 5,
    max_catch_limit: 3,
    exam_weeks: {},
    notes: '',
    schedules: [],
};

export default function CourseEditor({
    course,
    onChange,
}: {
    course: ParsedCourse & { tempId?: string };
    onChange: (data: CourseFormData) => void;
}) {
    const [form, setForm] = useState<CourseFormData>(DEFAULT_FORM);

    const update = (partial: Partial<CourseFormData>) => {
        const next = { ...form, ...partial };
        setForm(next);
        onChange(next);
    };

    const addRollcallMethod = () => {
        update({
            rollcall_methods: [...form.rollcall_methods, { method: '', frequency: '偶尔' }],
        });
    };

    const updateSchedule = (idx: number, field: string, value: any) => {
        const schedules = form.schedules.length > 0 ? [...form.schedules] : [{ weeks: course.weeks, day_of_week: course.day_of_week, period_slot: course.period_slot }];
        schedules[idx] = { ...schedules[idx], [field]: value };
        update({ schedules });
    };

    const currentSchedules = form.schedules.length > 0 ? form.schedules : [{ weeks: course.weeks, day_of_week: course.day_of_week, period_slot: course.period_slot }];

    return (
        <div className="card space-y-6">
            <h2 className="text-xl font-bold">{course.name}</h2>
            <div className="text-sm text-gray-400">{course.location} · {DAY_NAMES[course.day_of_week - 1]} {course.period_slot}</div>

            <div>
                <label className="text-gray-400 text-sm mb-1 block">课程基调</label>
                <select
                    value={form.course_type}
                    onChange={(e) => update({ course_type: e.target.value })}
                    className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                >
                    {COURSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {form.course_type === '水课' && <p className="text-xs text-yellow-500 mt-1">根据老师性格和考勤方差较大，不考虑在课上学习</p>}
                {form.course_type === '特殊课' && <p className="text-xs text-gray-500 mt-1">实验/体育类，辅助输入即可</p>}
            </div>

            {form.course_type === '专业课' && (
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">学习模式</label>
                    <div className="flex gap-3">
                        {STUDY_MODES.map(m => (
                            <button
                                key={m} type="button"
                                onClick={() => update({ study_mode: m })}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    form.study_mode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <label className="text-gray-400 text-sm mb-1 block">老师倾向</label>
                <select
                    value={form.teacher_attitude}
                    onChange={(e) => update({ teacher_attitude: e.target.value })}
                    className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                >
                    {TEACHER_ATTITUDES.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="">自定义...</option>
                </select>
            </div>

            <div>
                <label className="text-gray-400 text-sm mb-1 block">地理环境</label>
                <div className="flex gap-3">
                    {ESCAPE_DIFFICULTIES.map(d => (
                        <button key={d} type="button" onClick={() => update({ escape_difficulty: d })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                form.escape_difficulty === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}>
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-gray-400 text-sm mb-1 block">点名方式</label>
                {currentSchedules.map((s, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                        <select
                            value={form.rollcall_methods[idx]?.method || ''}
                            onChange={(e) => {
                                const methods = [...form.rollcall_methods];
                                methods[idx] = { ...methods[idx], method: e.target.value };
                                update({ rollcall_methods: methods });
                            }}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                        >
                            <option value="">选择...</option>
                            {ROLLCALL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                            value={form.rollcall_methods[idx]?.frequency || '偶尔'}
                            onChange={(e) => {
                                const methods = [...form.rollcall_methods];
                                methods[idx] = { ...methods[idx], frequency: e.target.value };
                                update({ rollcall_methods: methods });
                            }}
                            className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                        >
                            {['偶尔', '经常', '一直'].map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                ))}
                <button type="button" onClick={addRollcallMethod} className="text-sm text-blue-400 hover:text-blue-300">+ 添加点名方式</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">可接受每几节被抓一次</label>
                    <input type="number" min={1} max={20} value={form.catch_tolerance_per_class}
                        onChange={(e) => update({ catch_tolerance_per_class: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                </div>
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">最多能被抓几次</label>
                    <input type="number" min={1} max={10} value={form.max_catch_limit}
                        onChange={(e) => update({ max_catch_limit: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">期中考试周</label>
                    <input type="number" min={1} max={20} value={form.exam_weeks.mid || ''}
                        onChange={(e) => update({ exam_weeks: { ...form.exam_weeks, mid: e.target.value ? Number(e.target.value) : undefined } })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="无" />
                </div>
                <div>
                    <label className="text-gray-400 text-sm mb-1 block">期末考试周</label>
                    <input type="number" min={1} max={20} value={form.exam_weeks.final || ''}
                        onChange={(e) => update({ exam_weeks: { ...form.exam_weeks, final: e.target.value ? Number(e.target.value) : undefined } })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="无" />
                </div>
            </div>

            <div>
                <label className="text-gray-400 text-sm mb-1 block">排期修正（Parser 未能识别的周次信息）</label>
                <input type="text" value={currentSchedules[0]?.weeks.join(',')}
                    onChange={(e) => {
                        const weeks = e.target.value.split(',').map(Number).filter(n => !isNaN(n));
                        updateSchedule(0, 'weeks', weeks);
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                    placeholder="如: 1,2,3,5,6,7" />
            </div>

            <div>
                <label className="text-gray-400 text-sm mb-1 block">备注</label>
                <textarea
                    value={form.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 resize-none h-20"
                    placeholder="补充信息、手动修正等"
                />
            </div>
        </div>
    );
}
