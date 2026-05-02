'use client';

import { useState, useEffect, useCallback } from 'react';
import { DAY_NAMES } from '@/types';

interface Config {
    id: number;
    semester_start_date: string | null;
    semester_end_date: string | null;
    current_week: number | null;
    current_day_of_week: number | null;
}

interface Profile {
    id: number;
    has_completed_onboarding: boolean;
}

export default function SettingsPage() {
    const [config, setConfig] = useState<Config | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/config').then(r => r.json()),
            fetch('/api/profile').then(r => r.json()),
        ]).then(([c, p]) => {
            setConfig(c);
            setProfile(p);
        });
    }, []);

    const saveConfig = useCallback(async (updates: Partial<Config>) => {
        setSaving(true);
        await fetch('/api/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        setSaving(false);
        window.location.reload();
    }, []);

    const handleExport = useCallback(async () => {
        try {
            const [coursesRes, profileRes, configRes] = await Promise.all([
                fetch('/api/courses'),
                fetch('/api/profile'),
                fetch('/api/config'),
            ]);
            const [courses, profile, config] = await Promise.all([
                coursesRes.json(),
                profileRes.json(),
                configRes.json(),
            ]);

            const data = { courses, profile, config, export_date: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `skipclass-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('导出失败');
        }
    }, []);

    const handleReset = useCallback(async () => {
        localStorage.clear();
        window.location.href = '/onboarding';
    }, []);

    if (!config || !profile) {
        return <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">加载中...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold">设置</h1>

                <div className="card space-y-4">
                    <h2 className="text-xl font-bold">学期信息</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">学期开始</label>
                            <input type="date" value={config.semester_start_date || ''}
                                onChange={(e) => saveConfig({ semester_start_date: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">学期结束</label>
                            <input type="date" value={config.semester_end_date || ''}
                                onChange={(e) => saveConfig({ semester_end_date: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">当前第几周</label>
                            <input type="number" min={1} max={25} value={config.current_week || 1}
                                onChange={(e) => saveConfig({ current_week: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">今天是周几</label>
                            <select value={config.current_day_of_week || 1}
                                onChange={(e) => saveConfig({ current_day_of_week: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                                {DAY_NAMES.map((d, i) => <option key={i} value={i + 1}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card space-y-4">
                    <h2 className="text-xl font-bold">数据管理</h2>
                    <div className="flex gap-4">
                        <button onClick={handleExport} className="btn btn-secondary">📦 导出数据（JSON）</button>
                        <button onClick={() => setConfirmReset(true)} className="btn btn-primary bg-red-600 hover:bg-red-500">🗑️ 重置所有数据</button>
                    </div>
                </div>

                {confirmReset && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="card max-w-sm w-full mx-4 text-center">
                            <h3 className="text-lg font-bold mb-2">确认重置</h3>
                            <p className="text-gray-400 text-sm mb-6">所有数据将被清除，此操作不可恢复。</p>
                            <div className="flex gap-4 justify-center">
                                <button onClick={() => setConfirmReset(false)} className="btn btn-secondary">取消</button>
                                <button onClick={handleReset} className="btn bg-red-600 hover:bg-red-500 text-white">确认重置</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
