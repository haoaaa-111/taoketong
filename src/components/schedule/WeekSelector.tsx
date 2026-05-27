'use client';

import type { HistoryWeek } from '@/types';

interface Props {
  history: HistoryWeek[];
  currentWeek: number;
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  loading?: boolean;
}

export default function WeekSelector({ history, currentWeek, selectedWeek, onSelectWeek, loading }: Props) {
  const weeks = history.map((h) => h.week);

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <span className="text-sm text-gray-400">周次：</span>
      <select
        value={selectedWeek}
        onChange={(e) => onSelectWeek(parseInt(e.target.value, 10))}
        disabled={loading}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
      >
        {weeks.map((w) => (
          <option key={w} value={w}>
            第 {w} 周{w === currentWeek ? ' (当前)' : ''}
          </option>
        ))}
      </select>

      {selectedWeek !== currentWeek && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectWeek(currentWeek)}
            disabled={loading}
            className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600 disabled:opacity-50"
          >
            回到当前周
          </button>
        </div>
      )}
    </div>
  );
}
