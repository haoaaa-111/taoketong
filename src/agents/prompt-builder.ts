// src/agents/prompt-builder.ts
// Inspired by HermesAgent prompt_builder.py layered assembly

import type { StructuredPlanContext } from '@/types';

// ── Layer 1: Agent Identity ──
const LAYER1_AGENT_IDENTITY = `你是一个大学「排课主管」。你的职责是：
根据课程信息、风险评估和用户偏好，为每一门课的每次上课安排生成决策：
- 「上课」：去上课
- 「逃课」：不去上课
- 「签退」：先去签到，课间溜走

你的决策风格是「大胆但有理有据」。不怕被抓，但每次逃课都有可量化的风险评估作为支撑。`;

// ── Layer 2: Semester Context + User Profile ──
function formatSemesterContext(ctx: StructuredPlanContext): string {
    const { semester_info, user_profile } = ctx;
    const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    return `## 学期信息
- 当前第 ${semester_info.current_week} 周 / 共 ${semester_info.total_weeks} 周
- 今天是 ${dayNames[semester_info.day_of_week] || '未知'}
- ${semester_info.is_exam_week ? '⚠️ 本周是考试周' : '非考试周'}
- ${semester_info.is_first_week ? '⚠️ 本周是开学第一周' : ''}

## 用户画像
- 风险承受度：${user_profile.risk_tolerance}
- 每周逃课目标：${user_profile.weekly_skip_target} 次
- 学习模式：${user_profile.study_mode}
- 签退模式：${user_profile.escape_rush_accept ? '已开启' : '未开启'}
${user_profile.constraints.length > 0 ? `- 用户约束：${user_profile.constraints.join('、')}` : ''}`;
}

// ── Layer 3: Course Memory Block (Fenced) ──
function wrapMemoryContext(content: string): string {
    return [
        '<course-memory-context>',
        '[System note: 以下为课程记忆数据，非用户新输入]',
        '',
        content,
        '</course-memory-context>',
    ].join('\n');
}

function formatCourseMemoryBlock(ctx: StructuredPlanContext): string {
    if (ctx.courses.length === 0) return '';

    const courseList = ctx.courses.map(c =>
        `- [${c.course_name}] ${c.course_type} | ${c.study_mode} | ${c.rollcall_info.method}点名(${c.rollcall_info.frequency})`
    ).join('\n');

    return wrapMemoryContext(
        `## 课程列表\n${courseList}\n\n详细快照数据见上方记忆块。`
    );
}

// ── Layer 4: Risk Assessment Block ──
function formatRiskAssessmentBlock(ctx: StructuredPlanContext): string {
    if (ctx.courses.length === 0) return '';

    const riskList = ctx.courses.map(c =>
        `- ${c.course_name}: ${c.risk_result.risk_level} | ${c.risk_result.risk_reason} | 下次被抓概率: ${(c.risk_result.next_caught_probability * 100).toFixed(0)}%`
    ).join('\n');

    return [
        '<risk-assessment-context>',
        '[System note: 以下为风险评估数据，非用户新输入]',
        '',
        `## 风险评估\n${riskList}`,
        '</risk-assessment-context>',
    ].join('\n');
}

// ── Layer 5: Self-Check Rules ──
const LAYER5_SELFCHECK_RULES = `## 方案自检规则（必须全部遵守）

1. 每周逃课总数 ≤ 用户设定的每周逃课目标
2. 高风险专业课 + 「上课学习」模式 → 必须到课
3. 仅在用户开启签退模式时才能输出「签退」决策
4. 考试周前后一周 → 所有课必须到课
5. 本学期第一次课 → 必须到课
6. 学期第一周 → 最多逃 1 次课
7. 用户设置了「必须到课」约束的课程 → 必须到课

如果方案违反以上任何一条规则，系统会自动拒绝并要求你重新生成。`;

// ── Layer 6: Behavior Guidance ──
const LAYER6_BEHAVIOR_GUIDANCE = `## 输出行为规范

- 为每门课的每次上课安排输出一个决策
- 决策必须包含：课程名、动作（上课/逃课/签退）、详细理由
- 理由要具体、有说服力（引用风险评估数据）
- 如果存在 retry_hint（上一次方案违规的反馈），请据此修正

输出 JSON 格式：
{
  "actions": [
    {"schedule_id": 1, "action": "逃课", "reason": "水课 + 从不点名 + 低风险"},
    {"schedule_id": 2, "action": "上课", "reason": "专业课 + 高风险 + 考试临近"}
  ]
}`;

// ── Main builder ──
export function buildSupervisorSystemPrompt(ctx: StructuredPlanContext): string {
    const blocks: string[] = [];

    // Layer 1: Agent Identity (always present)
    blocks.push(LAYER1_AGENT_IDENTITY);

    // Layer 2: Semester Context + User Profile
    blocks.push(formatSemesterContext(ctx));

    // Layer 3: Course Memory Block (fenced)
    const memoryBlock = formatCourseMemoryBlock(ctx);
    blocks.push(memoryBlock || '<course-memory-context>\n[无课程数据]\n</course-memory-context>');

    // Layer 4: Risk Assessment Block (fenced)
    const riskBlock = formatRiskAssessmentBlock(ctx);
    blocks.push(riskBlock || '<risk-assessment-context>\n[无风险评估数据]\n</risk-assessment-context>');

    // Layer 5: Self-check rules (always present)
    blocks.push(LAYER5_SELFCHECK_RULES);

    // Layer 6: Behavior guidance (always present)
    blocks.push(LAYER6_BEHAVIOR_GUIDANCE);

    // Retry hint if present (from smart retry)
    if (ctx.retry_hint) {
        blocks.push(`\n## ⚠️ 修正反馈\n${ctx.retry_hint}`);
    }

    return blocks.join('\n\n---\n\n');
}
