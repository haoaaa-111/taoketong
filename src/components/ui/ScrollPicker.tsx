'use client';

import { useState, useRef, useCallback } from 'react';

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
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const itemHeight = 40;

    const snapTo = useCallback((container: HTMLDivElement | null, idx: number) => {
        if (!container) return;
        container.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
    }, [itemHeight]);

    const debouncedSnap = useCallback((container: HTMLDivElement | null, labels: string[], isYear: boolean) => {
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
            if (!container) return;
            const idx = Math.round(container.scrollTop / itemHeight);
            const clamped = Math.max(0, Math.min(idx, labels.length - 1));
            snapTo(container, clamped);
            if (isYear) {
                setYearIdx(clamped);
                onChange(`${labels[clamped]}-${(month < 10 ? '0' : '') + month}`);
            } else {
                setMonthIdx(clamped);
                onChange(`${year}-${String(clamped + 1).padStart(2, '0')}`);
            }
        }, 150);
    }, [month, year, onChange, snapTo]);

    return (
        <div className={`flex gap-4 items-center ${className}`}>
            <div className="relative flex-1 max-w-xs">
                <span className="text-gray-400 text-sm absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-20">年</span>
                <div className="relative h-[120px] overflow-hidden bg-gray-800/50 border border-gray-700 rounded-lg">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] bg-blue-600/30 border-y border-blue-500/40 pointer-events-none z-10 rounded" />
                    <div className="absolute inset-x-0 top-0 h-[40px] bg-gradient-to-b from-gray-800/80 to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-[40px] bg-gradient-to-t from-gray-800/80 to-transparent pointer-events-none z-10" />
                    <div
                        ref={yearRef}
                        className="h-full overflow-y-auto scrollbar-hide select-none"
                        onWheel={() => debouncedSnap(yearRef.current, years, true)}
                        onTouchEnd={() => debouncedSnap(yearRef.current, years, true)}
                    >
                        {Array.from({ length: 4 }, () => null).map((_, i) => (
                            <div key={`spacer-${i}`} style={{ height: itemHeight }} />
                        ))}
                        {years.map((y, i) => (
                            <div
                                key={y}
                                className={`text-center text-lg font-medium transition-colors duration-150 ${
                                    yearIdx === i ? 'text-blue-300' : 'text-gray-400'
                                }`}
                                style={{ height: itemHeight }}
                            >
                                {y}
                            </div>
                        ))}
                        {Array.from({ length: 4 }, () => null).map((_, i) => (
                            <div key={`spacer-${i}`} style={{ height: itemHeight }} />
                        ))}
                    </div>
                </div>
            </div>

            <span className="text-gray-500 text-xl">/</span>

            <div className="relative flex-1 max-w-24">
                <div className="relative h-[120px] overflow-hidden bg-gray-800/50 border border-gray-700 rounded-lg">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] bg-blue-600/30 border-y border-blue-500/40 pointer-events-none z-10 rounded" />
                    <div className="absolute inset-x-0 top-0 h-[40px] bg-gradient-to-b from-gray-800/80 to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-[40px] bg-gradient-to-t from-gray-800/80 to-transparent pointer-events-none z-10" />
                    <div
                        ref={monthRef}
                        className="h-full overflow-y-auto scrollbar-hide select-none"
                        onWheel={() => debouncedSnap(monthRef.current, months, false)}
                        onTouchEnd={() => debouncedSnap(monthRef.current, months, false)}
                    >
                        {Array.from({ length: 4 }, () => null).map((_, i) => (
                            <div key={`spacer-${i}`} style={{ height: itemHeight }} />
                        ))}
                        {months.map((m, i) => (
                            <div
                                key={m}
                                className={`text-center text-lg font-medium transition-colors duration-150 ${
                                    monthIdx === i ? 'text-blue-300' : 'text-gray-400'
                                }`}
                                style={{ height: itemHeight }}
                            >
                                {m}
                            </div>
                        ))}
                        {Array.from({ length: 4 }, () => null).map((_, i) => (
                            <div key={`spacer-${i}`} style={{ height: itemHeight }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
