'use client';

import { useState, useRef } from 'react';

interface ScrollPickerProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function ScrollPicker({ value, onChange, className = '' }: ScrollPickerProps) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const years = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i));
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

    const parseValue = (val: string) => {
        if (!val) return { year: currentYear, month: currentMonth };
        const [y, m] = val.split('-').map(Number);
        return { year: y || currentYear, month: m || currentMonth };
    };

    const { year, month } = parseValue(value);
    const [yearIdx, setYearIdx] = useState(Math.max(0, year - (currentYear - 5)));
    const [monthIdx, setMonthIdx] = useState(Math.max(0, month - 1));

    const yearRef = useRef<HTMLDivElement>(null);
    const monthRef = useRef<HTMLDivElement>(null);

    const itemHeight = 40;

    const handleScroll = (container: HTMLDivElement | null, setter: (idx: number) => void, labels: string[], isYear: boolean) => {
        if (!container) return;
        const newIndex = Math.round(container.scrollTop / itemHeight);
        const clamped = Math.max(0, Math.min(newIndex, labels.length - 1));
        setter(clamped);
        const m = (monthIdx + 1).toString().padStart(2, '0');
        const y = isYear ? labels[clamped] : String(year);
        onChange(isYear ? `${labels[clamped]}-${m}` : `${y}-${labels[clamped]}`);
    };

    const snapTo = (container: HTMLDivElement | null, idx: number) => {
        if (!container) return;
        container.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
    };

    const handleYearScrollEnd = () => {
        if (!yearRef.current) return;
        const idx = Math.round(yearRef.current.scrollTop / itemHeight);
        const clamped = Math.max(0, Math.min(idx, years.length - 1));
        setYearIdx(clamped);
        snapTo(yearRef.current, clamped);
        onChange(`${years[clamped]}-${(monthIdx + 1).toString().padStart(2, '0')}`);
    };

    const handleMonthScrollEnd = () => {
        if (!monthRef.current) return;
        const idx = Math.round(monthRef.current.scrollTop / itemHeight);
        const clamped = Math.max(0, Math.min(idx, months.length - 1));
        setMonthIdx(clamped);
        snapTo(monthRef.current, clamped);
        onChange(`${years[clamped >= 0 ? yearIdx : 0]}-${months[clamped]}`);
    };

    return (
        <div className={`flex gap-4 items-center ${className}`}>
            <div className="relative flex-1 max-w-xs">
                <span className="text-gray-500 text-sm absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-20">年</span>
                <div className="relative h-[120px] overflow-hidden bg-gray-900 border border-gray-700 rounded-lg">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] bg-blue-600/20 border-y border-blue-500/50 pointer-events-none z-10" />
                    <div
                        ref={yearRef}
                        className="h-full overflow-y-auto scroll-smooth scrollbar-hide select-none"
                        onScroll={(e) => handleScroll(e.currentTarget, setYearIdx, years, true)}
                        onWheel={() => { if (yearRef.current) handleYearScrollEnd(); }}
                        onTouchEnd={handleYearScrollEnd}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        <div style={{ height: itemHeight }} />
                        <div style={{ height: itemHeight }} />
                        {years.map((y, i) => (
                            <div
                                key={y}
                                className={`text-center text-lg font-medium ${
                                    yearIdx === i ? 'text-blue-400' : 'text-gray-500'
                                }`}
                                style={{ height: itemHeight, scrollSnapAlign: 'center' }}
                            >
                                {y}
                            </div>
                        ))}
                        <div style={{ height: itemHeight }} />
                        <div style={{ height: itemHeight }} />
                    </div>
                </div>
            </div>

            <span className="text-gray-400 text-xl">/</span>

            <div className="relative flex-1 max-w-24">
                <div className="relative h-[120px] overflow-hidden bg-gray-900 border border-gray-700 rounded-lg">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] bg-blue-600/20 border-y border-blue-500/50 pointer-events-none z-10" />
                    <div
                        ref={monthRef}
                        className="h-full overflow-y-auto scroll-smooth scrollbar-hide select-none"
                        onScroll={(e) => handleScroll(e.currentTarget, setMonthIdx, months, false)}
                        onWheel={() => { if (monthRef.current) handleMonthScrollEnd(); }}
                        onTouchEnd={handleMonthScrollEnd}
                        style={{ scrollSnapType: 'y mandatory' }}
                    >
                        <div style={{ height: itemHeight }} />
                        <div style={{ height: itemHeight }} />
                        {months.map((m, i) => (
                            <div
                                key={m}
                                className={`text-center text-lg font-medium ${
                                    monthIdx === i ? 'text-blue-400' : 'text-gray-500'
                                }`}
                                style={{ height: itemHeight, scrollSnapAlign: 'center' }}
                            >
                                {m}
                            </div>
                        ))}
                        <div style={{ height: itemHeight }} />
                        <div style={{ height: itemHeight }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
