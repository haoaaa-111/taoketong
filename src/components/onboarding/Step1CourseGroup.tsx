'use client';

import { useState } from 'react';
import { DAY_NAMES, type SessionEntry } from '@/types';

interface GroupData {
    name: string;
    teacher_name?: string;
    credits?: number;
    sessions: SessionEntry[];
}

interface CourseGroupProps {
    group: GroupData;
    sessionGroups: string[];
    onGroupChange: (updatedGroup: GroupData) => void;
    onAddSessionGroup: (name: string) => void;
    onDelete: () => void;
}

export default function Step1CourseGroup({ group, sessionGroups, onGroupChange, onAddSessionGroup, onDelete }: CourseGroupProps) {
    const [expanded, setExpanded] = useState(true);
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(group.name);
    const [editingTeacher, setEditingTeacher] = useState(false);
    const [teacherValue, setTeacherValue] = useState(group.teacher_name || '');
    const [editingCredits, setEditingCredits] = useState(false);
    const [creditsValue, setCreditsValue] = useState(String(group.credits ?? ''));
    const [addingSessionType, setAddingSessionType] = useState(false);
    const [newSessionTypeName, setNewSessionTypeName] = useState('');

    const commitSession = (idx: number, field: keyof SessionEntry, value: string | number | number[]) => {
        const sessions = [...group.sessions];
        sessions[idx] = { ...sessions[idx], [field]: value } as SessionEntry;
        onGroupChange({ ...group, sessions });
    };

    const specialGroups = sessionGroups.filter(g => g !== 'default');

    const handleCommitNewType = () => {
        if (newSessionTypeName.trim()) {
            onAddSessionGroup(newSessionTypeName.trim());
            setNewSessionTypeName('');
            setAddingSessionType(false);
        }
    };

    return (
        <div className="card border-l-4 border-l-blue-500">
            <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">
                            {editingName ? (
                                <input
                                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-lg font-bold"
                                    value={nameValue}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setNameValue(e.target.value)}
                                    onBlur={() => { setEditingName(false); if (nameValue.trim()) onGroupChange({ ...group, name: nameValue }); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { setEditingName(false); if (nameValue.trim()) onGroupChange({ ...group, name: nameValue }); } }}
                                    autoFocus
                                />
                            ) : (
                                <span onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }} title="双击编辑">
                                    {group.name}
                                </span>
                            )}
                        </h3>
                        <span className="text-gray-500 text-sm">{group.sessions.length} 个课次</span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                        {editingTeacher ? (
                            <input
                                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm inline-block"
                                value={teacherValue}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setTeacherValue(e.target.value)}
                                onBlur={() => { setEditingTeacher(false); onGroupChange({ ...group, teacher_name: teacherValue || undefined }); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setEditingTeacher(false); onGroupChange({ ...group, teacher_name: teacherValue || undefined }); } }}
                                placeholder="老师姓名"
                                autoFocus
                            />
                        ) : (
                            <span onDoubleClick={(e) => { e.stopPropagation(); setEditingTeacher(true); }}>{group.teacher_name || '点击设置老师'}</span>
                        )}
                        {' · '}
                        {editingCredits ? (
                            <input
                                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm inline-block w-16"
                                value={creditsValue}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setCreditsValue(e.target.value)}
                                onBlur={() => { setEditingCredits(false); onGroupChange({ ...group, credits: creditsValue ? Number(creditsValue) : undefined }); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setEditingCredits(false); onGroupChange({ ...group, credits: creditsValue ? Number(creditsValue) : undefined }); } }}
                                inputMode="numeric"
                                placeholder="学分"
                                autoFocus
                            />
                        ) : (
                            <span onDoubleClick={(e) => { e.stopPropagation(); setEditingCredits(true); }}>{group.credits != null ? `${group.credits} 学分` : '点击设学分'}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="text-red-400 hover:text-red-300 text-sm"
                    >
                        删除
                    </button>
                    <span className="text-gray-500 text-lg">{expanded ? '▾' : '▸'}</span>
                </div>
            </div>

            {expanded && (
                <div className="mt-4 space-y-3">
                    <div className="text-sm font-semibold text-gray-300">课次列表</div>
                    {group.sessions.map((s, idx) => {
                        const isSpecial = s.sessionGroup !== 'default';
                        return (
                            <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isSpecial ? 'bg-yellow-900/20 border border-yellow-700/30' : 'bg-gray-900/50 border border-gray-800'}`}>
                                <span className="font-medium text-gray-200 whitespace-nowrap">
                                    {DAY_NAMES[s.day_of_week - 1]} {s.period_slot}
                                </span>
                                <span className="text-gray-500">第 </span>
                                <input
                                    className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-sm w-28 text-center text-gray-300"
                                    defaultValue={s.weeks.join(',')}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={(e) => {
                                        const weeks = e.target.value.split(/[，,、]/).map(Number).filter(n => !isNaN(n) && n > 0);
                                        if (weeks.length > 0) commitSession(idx, 'weeks', weeks);
                                        else e.target.value = s.weeks.join(',');
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const input = e.currentTarget as HTMLInputElement;
                                            const weeks = input.value.split(/[，,、]/).map(Number).filter(n => !isNaN(n) && n > 0);
                                            if (weeks.length > 0) commitSession(idx, 'weeks', weeks);
                                            input.blur();
                                        }
                                    }}
                                />
                                <span className="text-gray-500"> 周</span>
                                <select
                                    value={s.sessionGroup}
                                    className="ml-auto bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
                                    onChange={(e) => commitSession(idx, 'sessionGroup', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="default">默认课次</option>
                                    {specialGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        );
                    })}

                    <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-300">特殊课次类型</span>
                            <button
                                type="button"
                                onClick={() => setAddingSessionType(!addingSessionType)}
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                {addingSessionType ? '取消' : '+ 添加类型'}
                            </button>
                        </div>

                        {addingSessionType && (
                            <div className="flex gap-2 mt-2">
                                <input
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm"
                                    placeholder='如实验课、习题课'
                                    value={newSessionTypeName}
                                    onChange={(e) => setNewSessionTypeName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCommitNewType(); }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="btn btn-primary text-xs py-1.5"
                                    onClick={handleCommitNewType}
                                >
                                    确认
                                </button>
                            </div>
                        )}

                        {specialGroups.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {specialGroups.map(g => (
                                    <span key={g} className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">{g}</span>
                                ))}
                            </div>
                        )}
                        {specialGroups.length === 0 && (
                            <p className="text-xs text-gray-600 mt-1">暂无特殊课次类型，添加后课次下拉中可选</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
