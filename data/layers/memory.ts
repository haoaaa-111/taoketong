import type { PromptLayer } from '@/data/prompt-layers';
import { listCourseMetas, readCourseMeta } from '@/data/fs-store';

export function buildMemoryLayers(userInput: string): PromptLayer[] {
  return [
    { name: 'user-input', content: userInput },
    {
      name: 'current-state',
      content: summarizeAllCourses(),
      systemNote: '当前所有课程的元数据摘要，作为更新建议的参考基线',
    },
  ];
}

export function summarizeAllCourses(): string {
  const names = listCourseMetas();
  if (names.length === 0) return '暂无课程数据';
  return names
    .map(name => {
      const meta = readCourseMeta(name);
      return `- **${name}** | ${meta.teacherAttitude} | 点名: ${meta.rollcallMethods.map(m => m.method).join(',')} | 备注: ${meta.notes || '无'}`;
    })
    .join('\n');
}
