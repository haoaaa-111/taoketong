'use client';

import { useState, useEffect } from 'react';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import type { PlanAction, RollcallEvent } from '@/types';

interface Props {
  week: number;
  currentWeek: number;
  onRollback: (week: number) => Promise<void>;
  onClose: () => void;
}

interface ScheduleItem {
  id: number;
  day_of_week: number;
  period_slot: string;
  course_id: number;
}

interface CourseItem {
  id: number;
  name: string;
}

export default function HistoryView({ week, currentWeek, onRollback, onClose }: Props) {
  const [actions, setActions] = useState<PlanAction[]>([]);
  const [rollcallEvents, setRollcallEvents] = useState<RollcallEvent[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetch(`/api/history/${week}`).then((r) => {
        if (!r.ok) throw new Error('加载失败');
        return r.json();
      }),
      fetch('/api/courses').then((r) => {
        if (!r.ok) throw new Error('加载课程失败');
        return r.json();
      }),
    ])
      .then(([historyData, coursesData]) => {
        setActions(historyData.plan || []);
        setRollcallEvents(historyData.rollcallEvents || []);
        setFeedback(historyData.feedback || '');
        
        if (coursesData?.courses) {
          const allCourses: CourseItem[] = [];
          const allSchedules: ScheduleItem[] = [];
          
          for (const item of coursesData.courses) {
            allCourses.push({ id: item.course.id, name: item.course.name });
            
            for (const s of item.schedules) {
              allSchedules.push({
                id: s.id,
                day_of_week: s.day_of_week,
                period_slot: s.period_slot,
                course_id: item.course.id,
              });
            }
          }
          
          setCourses(allCourses);
          setSchedules(allSchedules);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [week]);

  const handleRollback = async () => {
    if (!confirm(`确定要回滚到第 ${week} 周的计划吗？当前第 ${currentWeek} 周的计划将被覆盖。`)) return;
    setRolling(true);
    try {
      await onRollback(week);
    } catch {
      setRolling(false);
    }
  };

  if (loading) {
    return (
      <div className="card text-center py-8 text-gray-400">加载中...</div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-8 text-red-400">{error}</div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="card text-center py-8 text-gray-400">第 {week} 周无计划数据</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">第 {week} 周历史方案</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">
          关闭
        </button>
      </div>

      <ScheduleGrid
        actions={actions}
        schedules={schedules}
        courses={courses}
      />

      {week < currentWeek && (
        <div className="flex justify-center">
          <button
            onClick={handleRollback}
            disabled={rolling}
            className="btn btn-primary"
          >
            {rolling ? '回滚中...' : `↩ 回滚到第 ${week} 周方案`}
          </button>
        </div>
      )}

      {rollcallEvents.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-3">📋 第 {week} 周点名记录</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="p-2 text-left">课程</th>
                  <th className="p-2 text-center">计划</th>
                  <th className="p-2 text-center">实际</th>
                  <th className="p-2 text-center">结果</th>
                </tr>
              </thead>
              <tbody>
                {[...new Map(rollcallEvents.map((e) => [`${e.courseName}-${e.date}`, e])).values()].map((e, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="p-2">{e.courseName}</td>
                    <td className="p-2 text-center">
                      <span className={e.plannedAction === '逃课' ? 'text-red-400' : 'text-green-400'}>
                        {e.plannedAction}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span className={e.actualAction === '逃课' ? 'text-red-400' : 'text-green-400'}>
                        {e.actualAction}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      {e.wasCaught ? (
                        <span className="text-red-400" title={e.plannedAction === '逃课' ? '计划逃课，实际被抓' : '计划上课，被抓点名'}>
                          ❌ 被抓
                        </span>
                      ) : (
                        <span className="text-green-400">✅ 安全</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {feedback && (
        <div className="card">
          <h3 className="text-lg font-bold mb-3">💬 第 {week} 周反馈</h3>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 p-3 rounded-lg overflow-auto max-h-64">
            {feedback}
          </pre>
        </div>
      )}
    </div>
  );
}
