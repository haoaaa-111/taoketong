import { readFileSync } from 'node:fs';
import type { PromptLayer } from '../prompt-layers';

/** Build analyzer layers: user strategy text + system prompt */
export function buildAnalyzerLayers(strategyRaw: string): PromptLayer[] {
  const systemPrompt = readFileSync('prompts/school-skill/analyzer.md', 'utf-8');
  return [
    { name: 'freeform-strategy', content: strategyRaw },
    { name: 'analysis-instructions', content: systemPrompt, systemNote: 'System prompt — analyze the raw strategy text above.' },
  ];
}

/** Build builder layers: analyzer output + generic context + teacher templates + system prompt */
export function buildBuilderLayers(
  analysisJson: string,
  genericRollcallMd: string,
): PromptLayer[] {
  const systemPrompt = readFileSync('prompts/school-skill/builder.md', 'utf-8');
  
  // Load all generic teacher type templates
  const teacherTypes = ['strict-old-school', 'easygoing-young', 'random-sampling', 'rollcall-every-time', 'never-rollcall'];
  const teacherTemplates = teacherTypes
    .map((type) => {
      const filePath = `prompts/skills/teachers/${type}.md`;
      try {
        const content = readFileSync(filePath, 'utf-8');
        return `### ${type}\n${content}`;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join('\n---\n');
  
  return [
    { name: 'analyzer-output', content: analysisJson, systemNote: '学校策略的结构化分析结果' },
    { name: 'generic-rollcall-rules', content: genericRollcallMd, systemNote: '通用点名规律（作为参考基线）' },
    { name: 'generic-teacher-templates', content: teacherTemplates, systemNote: '通用教师类型模板。仅当学校特化行为与通用模板显著不同时才生成 teacher overrides。' },
    { name: 'builder-instructions', content: systemPrompt, systemNote: 'System prompt — generate school-specific rollcall skill from analysis above.' },
  ];
}
