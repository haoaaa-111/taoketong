'use client';

import Link from 'next/link';

const INFO_ROWS = [
  { category: '课表截图', detail: '一张清晰的课程表图片，或手动录入课程名、时间、教室' },
  { category: '学期时间', detail: '学期开始/结束月份、当前第几周、今天是周几' },
  { category: '逃课目标', detail: '为什么逃课（考研/考公/自学等），目标每周逃几节' },
  { category: '逃课习惯', detail: '目前一周实际逃几节、代课预算、能不能接受签到后溜走' },
  { category: '到教室时间', detail: '从宿舍/住处到教学楼大概多少分钟' },
  { category: '计划跨度', detail: '未来几周内需要方案' },
  { category: '课程硬信息', detail: '每门课：专业课还是水课、老师严不严、点名方式及频率、考试周、教室内外好不好溜' },
  { category: '课程软信息', detail: '每门课：老师点名/作业/小测习惯、有课程群吗、消息是不是只在课上说、能自学吗、资料好找吗' },
];

const STEPS = [
  { num: '①', title: '导入课表', desc: '上传截图或手动录入' },
  { num: '②', title: '设定偏好', desc: '选择你的逃课目标和习惯' },
  { num: '③', title: '校对课程', desc: '逐门确认老师、点名等细节' },
];

export default function OnboardingRoot() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🎯 逃课通</h1>
          <p className="text-gray-400">准备好以下信息，3 分钟内完成设置，AI 自动生成逃课方案</p>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3 flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <span className="text-2xl mb-1">{step.num}</span>
                  <span className="text-sm font-medium">{step.title}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{step.desc}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="text-gray-600 mt-2 shrink-0">─</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-bold">📋 所需信息</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-4 text-gray-400 font-medium w-28">信息类别</th>
                <th className="text-left py-2 text-gray-400 font-medium">需要你提供</th>
              </tr>
            </thead>
            <tbody>
              {INFO_ROWS.map((row) => (
                <tr key={row.category} className="border-b border-gray-800 last:border-b-0">
                  <td className="py-2.5 pr-4 text-gray-300 align-top whitespace-nowrap">{row.category}</td>
                  <td className="py-2.5 text-gray-400">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center">
          <Link href="/onboarding/step1" className="btn btn-primary inline-block text-lg px-8 py-3">
            开始使用 →
          </Link>
        </div>
      </div>
    </div>
  );
}
