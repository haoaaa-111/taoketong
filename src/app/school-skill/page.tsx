'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface SchoolSkill {
  slug: string;
  meta: {
    schoolName: string;
    createdAt: string;
    version: number;
    sourceLength: number;
    generatedFiles: string[];
  } | null;
  hasRollcall: boolean;
}

export default function SchoolSkillPage() {
  const [skills, setSkills] = useState<SchoolSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    setLoading(true);
    try {
      const res = await fetch('/api/school-skill');
      const data = await res.json();
      if (data.success) {
        setSkills(data.skills);
      } else {
        setError(data.error?.message || '加载失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(slug: string) {
    if (expandedSlug === slug) {
      setExpandedSlug(null);
      setExpandedContent(null);
      return;
    }
    setExpandedSlug(slug);
    setContentLoading(true);
    try {
      const res = await fetch(`/api/school-skill/${slug}/rollcall`);
      if (res.ok) {
        const data = await res.json();
        setExpandedContent(data.content || '文件为空');
      } else {
        setExpandedContent('加载内容失败');
      }
    } catch {
      setExpandedContent('网络错误');
    } finally {
      setContentLoading(false);
    }
  }

  async function handleRegenerate(slug: string) {
    if (!confirm('确认重新生成该校的逃课策略？这将覆盖当前版本。')) return;
    try {
      const res = await fetch('/api/school-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('重新生成成功！');
        loadSkills();
      } else {
        toast.error(`生成失败: ${data.error?.message || '未知错误'}`);
      }
    } catch {
      toast.error('网络错误');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-3xl font-bold">学校逃课策略</h1>
          <p className="text-gray-400">还没有生成任何学校策略。</p>
          <p className="text-sm text-gray-500">
            在首次使用的「用户画像」阶段粘贴你的学校逃课攻略，AI 会自动生成针对你学校的策略文件。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">🏫 学校逃课策略</h1>
          <p className="text-gray-400 text-sm">
            基于你提供的学校经验，AI 生成了这些针对你学校的逃课策略文件。
          </p>
        </div>

        {skills.map((skill) => (
          <div key={skill.slug} className="card space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">
                  {skill.meta?.schoolName || skill.slug}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  生成于 {skill.meta?.createdAt ? new Date(skill.meta.createdAt).toLocaleString('zh-CN') : '未知'}
                  · 版本 {skill.meta?.version || 1}
                  · {skill.meta?.sourceLength || 0} 字原始攻略
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${skill.hasRollcall ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                {skill.hasRollcall ? '已生成' : '缺失'}
              </span>
            </div>

            {skill.meta?.generatedFiles && skill.meta.generatedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skill.meta.generatedFiles.map((f) => (
                  <span key={f} className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">
                    {f}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => toggleExpand(skill.slug)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {expandedSlug === skill.slug ? '收起内容' : '查看 rollcall.md'}
              </button>
              <button
                onClick={() => handleRegenerate(skill.slug)}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                重新生成
              </button>
            </div>

            {expandedSlug === skill.slug && (
              <div className="mt-3 p-4 rounded-lg bg-gray-900 border border-gray-700">
                {contentLoading ? (
                  <div className="text-gray-400 text-sm">加载中...</div>
                ) : (
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                    {expandedContent}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
