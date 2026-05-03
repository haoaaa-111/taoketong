'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChipSelect from '@/components/onboarding/ChipSelect';

const SKIP_MOTIVATIONS = ['考研', '考公', '自学', '实习', '娱乐', '单纯想逃', '自定义'];

function useNumericInput(initialValue: number) {
    const initialDisplay = initialValue === 0 ? '' : String(initialValue);
    const [displayText, setDisplayText] = useState(initialDisplay);
    const [value, setValue] = useState(initialValue);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '' || /^\d+$/.test(raw)) {
            setDisplayText(raw);
            setValue(raw === '' ? 0 : Number(raw));
        }
    };

    return { displayText, value, setValue, onChange };
}

export default function OnboardingStep2() {
    const router = useRouter();
    const [form, setForm] = useState({
        skip_motivation: [] as string[],
        weekly_skip_habit: 0,
        weekly_skip_target: 1,
        sub_cost_max: 30,
        escape_rush_accept: false,
        commute_cost_minutes: 10,
        plan_weeks: 1,
    });
    const [customMotivation, setCustomMotivation] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    useEffect(() => {
        const step1Data = localStorage.getItem('onboarding_step1');
        if (!step1Data) router.push('/onboarding/step1');
    }, [router]);

    const handleMotivationChange = (selected: string[]) => {
        const hasCustom = selected.includes('自定义');

        if (hasCustom && !form.skip_motivation.includes('自定义')) {
            setShowCustomInput(true);
        }
        if (!hasCustom) {
            setShowCustomInput(false);
        }

        const cleaned = selected.filter(s => s !== '自定义');
        setForm(f => ({ ...f, skip_motivation: hasCustom ? [...cleaned, '自定义'] : cleaned }));
    };

    const commitCustomMotivation = () => {
        if (customMotivation.trim()) {
            setForm(f => ({
                ...f,
                skip_motivation: f.skip_motivation.map(m => m === '自定义' ? customMotivation.trim() : m),
            }));
            setCustomMotivation('');
            setShowCustomInput(false);
        }
    };

    const habitInput = useNumericInput(form.weekly_skip_habit);
    const targetInput = useNumericInput(form.weekly_skip_target);
    const subCostInput = useNumericInput(form.sub_cost_max);
    const commuteInput = useNumericInput(form.commute_cost_minutes);
    const planWeeksInput = useNumericInput(form.plan_weeks);

    const handleNext = async () => {
        const step1Data = JSON.parse(localStorage.getItem('onboarding_step1')!);

        await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                skip_motivation: form.skip_motivation,
                weekly_skip_habit: form.weekly_skip_habit,
                weekly_skip_target: form.weekly_skip_target,
                sub_cost_max: form.sub_cost_max,
                escape_rush_accept: form.escape_rush_accept,
                commute_cost_minutes: form.commute_cost_minutes,
                plan_start_date: new Date().toISOString().split('T')[0],
                plan_weeks: form.plan_weeks,
                has_completed_onboarding: false,
            }),
        });

        await fetch('/api/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                semester_start_date: step1Data.semester_start || null,
                semester_end_date: step1Data.semester_end || null,
                current_week: step1Data.current_week,
                current_day_of_week: step1Data.current_day_of_week,
            }),
        });

        router.push('/onboarding/step3');
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
            <div className="max-w-2xl mx-auto card space-y-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">你的逃课偏好</h1>
                    <p className="text-gray-400">这些信息帮助 AI 为你生成个性化方案</p>
                </div>

                <ChipSelect
                    label="逃课动机（多选）"
                    options={SKIP_MOTIVATIONS}
                    selected={form.skip_motivation.includes('自定义') ? [...form.skip_motivation.filter(m => m !== '自定义'), '自定义'] : form.skip_motivation}
                    onChange={handleMotivationChange}
                />

                {showCustomInput && (
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                            placeholder="输入你的逃课动机"
                            value={customMotivation}
                            onChange={(e) => setCustomMotivation(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitCustomMotivation(); }}
                            autoFocus
                        />
                        <button type="button" className="btn btn-primary" onClick={commitCustomMotivation}>确认</button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">平常一周逃几节课</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={habitInput.displayText}
                            onChange={habitInput.onChange}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">目标每周逃几节课 🎯</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="1"
                            value={targetInput.displayText}
                            onChange={targetInput.onChange}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-gray-400 text-sm mb-1 block">代课预算（元/节）</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="30"
                        value={subCostInput.displayText}
                        onChange={subCostInput.onChange}
                        className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium">能否抗压上课后溜走</div>
                        <div className="text-xs text-gray-500">签退选项，需要一定的行动力</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.escape_rush_accept}
                            onChange={(e) => setForm(f => ({ ...f, escape_rush_accept: e.target.checked }))}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div>
                    <label className="text-gray-400 text-sm mb-1 block">到教室的时间成本（分钟）</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="10"
                        value={commuteInput.displayText}
                        onChange={commuteInput.onChange}
                        className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                    />
                </div>

                <div>
                    <label className="text-gray-400 text-sm mb-1 block">计划跨度（周数）</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
                        value={planWeeksInput.displayText}
                        onChange={planWeeksInput.onChange}
                        className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">计划越短越准 🎯</p>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={handleNext} className="btn btn-primary">
                        下一步：课程校对
                    </button>
                </div>
            </div>
        </div>
    );
}
