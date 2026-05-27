import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { chatCompletionJSON } from '@/lib/llm';
import { buildUserPrompt } from '@/data/prompt-layers';
import { buildAnalyzerLayers, buildBuilderLayers } from '@/data/layers/school-skill';
import { slugify } from '@/data/fs-store';
import { logger } from '@/lib/logger';
import type { SchoolSkillMeta } from '@/types';

// ── Step A: Analyzer output schema ──

const AnalyzerOutputSchema = z.object({
  institution: z.object({
    name: z.string(),
    attendance_policy: z.string(),
    makeup_rules: z.string(),
    absence_limit: z.string(),
  }),
  hard_rules: z.array(z.object({
    rule: z.string(),
    source: z.string(),
  })),
  locations: z.array(z.object({
    name: z.string(),
    type: z.enum(['safe', 'risky']),
    detail: z.string(),
  })),
  teacher_insights: z.array(z.object({
    teacher_type: z.string(),
    insight: z.string(),
  })),
  market_info: z.string(),
  community_tips: z.array(z.string()),
});
type AnalyzerOutput = z.infer<typeof AnalyzerOutputSchema>;

// ── Step B: Builder output schema ──

const BuilderOutputSchema = z.object({
  rollcallMd: z.string(),
  teacherOverrides: z.record(z.string(), z.string()),
});
type BuilderOutput = z.infer<typeof BuilderOutputSchema>;

// ── Helpers ──

const ROLLCALL_SKILLS_DIR = join('data', 'rollcallskills');

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function atomicWrite(filePath: string, content: string): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, content, 'utf-8');
  renameSync(tmpPath, filePath);
}

// ── Main ──

export interface GenerateSchoolSkillResult {
  slug: string;
  generatedFiles: string[];
}

/**
 * Generate school-level rollcall skill from user-pasted strategy text.
 * 3-step pipeline: Analyze → Build → Write
 */
export async function generateSchoolSkill(
  schoolName: string,
  strategyRaw: string,
): Promise<GenerateSchoolSkillResult> {
  const slug = slugify(schoolName);

  logger.info('SchoolSkillGenerator', `Generating skill for school: ${schoolName} (slug: ${slug})`);

  // Step A: Analyze raw strategy text into structured data
  const analyzerLayers = buildAnalyzerLayers(strategyRaw);
  const analysis = await chatCompletionJSON<AnalyzerOutput>({
    systemPrompt: 'You are a university skip-class strategy analyzer. Extract structured information from the user-provided freeform text.',
    userPrompt: buildUserPrompt(analyzerLayers),
    temperature: 0.3,
    schema: AnalyzerOutputSchema,
    circuitKey: 'school-skill-analyzer',
  });
  logger.info('SchoolSkillGenerator', `Analysis complete: ${analysis.hard_rules.length} hard rules, ${analysis.teacher_insights.length} teacher insights`);

  // Step B: Build school-specific rollcall.md from analysis + generic context
  const genericRollcall = readFileSync('prompts/skills/rollcall.md', 'utf-8');
  const builderLayers = buildBuilderLayers(
    JSON.stringify(analysis, null, 2),
    genericRollcall,
  );
  const buildResult = await chatCompletionJSON<BuilderOutput>({
    systemPrompt: 'You are a school-level rollcall pattern builder. Merge school-specific insights with generic knowledge.',
    userPrompt: buildUserPrompt(builderLayers),
    temperature: 0.5,
    schema: BuilderOutputSchema,
    circuitKey: 'school-skill-builder',
  });
  logger.info('SchoolSkillGenerator', `Build complete: rollcall.md ${buildResult.rollcallMd.length} chars, ${Object.keys(buildResult.teacherOverrides).length} teacher overrides`);

  // Step C: Write files to data/rollcallskills/{slug}/
  const skillDir = join(ROLLCALL_SKILLS_DIR, slug);
  const versionsDir = join(skillDir, 'versions');
  const teachersDir = join(skillDir, 'teachers');

  // Archive old version if exists
  if (existsSync(skillDir)) {
    const vDir = join(versionsDir, `v${Date.now()}`);
    ensureDir(vDir);
    if (existsSync(join(skillDir, 'rollcall.md'))) {
      copyFileSync(join(skillDir, 'rollcall.md'), join(vDir, 'rollcall.md'));
    }
    if (existsSync(join(skillDir, 'meta.json'))) {
      copyFileSync(join(skillDir, 'meta.json'), join(vDir, 'meta.json'));
    }
  }

  ensureDir(skillDir);
  ensureDir(teachersDir);
  ensureDir(versionsDir);

  const generatedFiles: string[] = [];

  // Write rollcall.md
  const rollcallPath = join(skillDir, 'rollcall.md');
  atomicWrite(rollcallPath, buildResult.rollcallMd);
  generatedFiles.push('rollcall.md');

  // Write teacher overrides
  for (const [teacherType, content] of Object.entries(buildResult.teacherOverrides)) {
    if (content && content.trim()) {
      const filePath = join(teachersDir, `${teacherType}.md`);
      atomicWrite(filePath, content);
      generatedFiles.push(`teachers/${teacherType}.md`);
    }
  }

  // Write meta.json
  const meta: SchoolSkillMeta = {
    schoolName,
    slug,
    createdAt: new Date().toISOString(),
    version: 1,
    sourceLength: strategyRaw.length,
    generatedFiles,
  };
  atomicWrite(join(skillDir, 'meta.json'), JSON.stringify(meta, null, 2));
  generatedFiles.push('meta.json');

  logger.info('SchoolSkillGenerator', `Skill generated: ${generatedFiles.length} files at ${skillDir}`);
  return { slug, generatedFiles };
}
