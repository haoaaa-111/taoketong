import { NextResponse } from 'next/server';
import { readSchoolRollcallSkill, readSchoolSkillMeta, listSchoolSkills } from '@/data/fs-store';
import { readProfile } from '@/data/fs-store';
import { generateSchoolSkill } from '@/agents/school-skill-generator';
import { logger } from '@/lib/logger';

export async function GET(): Promise<NextResponse> {
  try {
    const skills = listSchoolSkills();
    const result = skills.map((slug) => {
      const meta = readSchoolSkillMeta(slug);
      const hasRollcall = readSchoolRollcallSkill(slug) !== null;
      return { slug, meta, hasRollcall };
    });
    return NextResponse.json({ success: true, skills: result });
  } catch (e) {
    logger.error('SchoolSkillAPI', `GET error: ${String(e)}`);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: String(e) } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const schoolName = body.school_name as string | undefined;
    const strategyRaw = body.strategy_raw as string | undefined;

    // If not provided in body, try to read from profile
    const profile = schoolName || strategyRaw ? null : readProfile();
    const effectiveSchoolName = schoolName || profile?.school_name;
    const effectiveStrategyRaw = strategyRaw || profile?.school_strategy_raw;

    if (!effectiveStrategyRaw || effectiveStrategyRaw.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_STRATEGY', message: '请提供学校攻略文本（strategy_raw）或在用户画像中填写' } },
        { status: 400 },
      );
    }

    const name = effectiveSchoolName?.trim() || '默认学校';
    const result = await generateSchoolSkill(name, effectiveStrategyRaw);

    return NextResponse.json({
      success: true,
      slug: result.slug,
      generatedFiles: result.generatedFiles,
    });
  } catch (e) {
    logger.error('SchoolSkillAPI', `POST error: ${String(e)}`);
    return NextResponse.json(
      { success: false, error: { code: 'GENERATION_FAILED', message: String(e) } },
      { status: 500 },
    );
  }
}
