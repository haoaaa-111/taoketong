import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PromptLayer } from '../prompt-layers';
import { readCourseMeta, readRollcallHistory, formatCourseMeta } from '../fs-store';
import { TEACHER_SKILL_CANDIDATES, DEFAULT_TEACHER_SKILL } from '../../prompts/skills/teachers/map';
import { logger } from '@/lib/logger';
import type { RollcallEvent } from '@/types';

function readSkill(name: string): string | null {
  const file = `prompts/skills/teachers/${name}.md`;
  if (!existsSync(file)) {
    logger.warn('Modeler', `Skill file missing: ${name}, skipped`);
    return null;
  }
  return readFileSync(file, 'utf-8');
}

export function buildTeacherSkillLayers(attitude: string, schoolSlug?: string): PromptLayer[] {
  const layers: PromptLayer[] = [];

  const defaultSkill = readSkill(DEFAULT_TEACHER_SKILL);
  if (defaultSkill) {
    layers.push({
      name: 'evaluation-framework',
      content: defaultSkill,
      systemNote: '评估框架。请结合下方候选类型和课程数据交叉判断',
    });
  }

  const candidates = TEACHER_SKILL_CANDIDATES[attitude]
    || TEACHER_SKILL_CANDIDATES['不确定'];
  const skillContents = candidates
    .filter(name => name !== DEFAULT_TEACHER_SKILL)
    .map(readSkill)
    .filter(Boolean);

  if (skillContents.length > 0) {
    const block = skillContents
      .map((content, i) => `### 候选类型 ${i + 1}\n${content}`)
      .join('\n---\n');
    layers.push({
      name: 'candidate-teacher-types',
      content: block,
      systemNote: '以上为可能的老师类型候选。请结合课程数据和评估框架，判断最匹配的类型。在 refined_profile 中说明选择理由。',
    });
  }

  if (schoolSlug) {
    const overridesDir = join('data', 'rollcallskills', schoolSlug, 'teachers');
    const overrideFiles = candidates
      .filter(name => name !== DEFAULT_TEACHER_SKILL)
      .map(name => {
        const filePath = join(overridesDir, `${name}.md`);
        if (existsSync(filePath)) {
          return { type: name, content: readFileSync(filePath, 'utf-8') };
        }
        return null;
      })
      .filter(Boolean);

    if (overrideFiles.length > 0) {
      const block = overrideFiles
        .map((o, i) => `### ${o!.type}（本校特化）\n${o!.content}`)
        .join('\n---\n');
      layers.push({
        name: 'teacher-school-overrides',
        content: block,
        systemNote: '以下为本校特化的教师行为补充。当与上方通用模板冲突时，以本校特化版本为准。',
      });
    }
  }

  return layers;
}

export function readRollcallRules(): string {
  return readFileSync('prompts/skills/rollcall.md', 'utf-8');
}

export function buildModelerLayers(courseName: string, schoolSlug?: string): PromptLayer[] {
  const meta = readCourseMeta(courseName);
  const history = readRollcallHistory(courseName);

  const layers: PromptLayer[] = [
    { name: 'course-meta', content: formatCourseMeta(meta) },
    ...buildTeacherSkillLayers(meta.teacherAttitude, schoolSlug),
  ];

  let hasSchoolRules = false;
  if (schoolSlug) {
    try {
      const schoolFile = join('data', 'rollcallskills', schoolSlug, 'rollcall.md');
      if (existsSync(schoolFile)) {
        layers.push({
          name: 'school-specific-rules',
          content: readFileSync(schoolFile, 'utf-8'),
          systemNote: '以下为该校特化规律，优先级高于通用规律。如果存在冲突，以本层为准。',
        });
        hasSchoolRules = true;
      }
    } catch {
    }
  }

  layers.push({
    name: 'rollcall-rules',
    content: readRollcallRules(),
    systemNote: hasSchoolRules ? '以上为通用点名规律（参考基线）。优先遵循上方的 school-specific-rules。' : undefined,
  });

  layers.push({
    name: 'rollcall-history',
    content: formatHistory(history),
    condition: history.length > 0,
  });

  return layers;
}

function formatHistory(events: RollcallEvent[]): string {
  if (!events || events.length === 0) return '';
  return events.map(e =>
    `- ${e.date} | ${e.courseName} | 计划:${e.plannedAction} → 实际:${e.actualAction} | 被抓:${e.wasCaught ? '是' : '否'} | 点名:${e.rollcallMethod || '-'}`
  ).join('\n');
}
