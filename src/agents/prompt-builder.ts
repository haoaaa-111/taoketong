// src/agents/prompt-builder.ts
// Inspired by HermesAgent prompt_builder.py layered assembly

import type { StructuredPlanContext } from '@/types';

// ── Layer 1: Semester Context + User Profile ──
function formatSemesterContext(ctx: StructuredPlanContext): string {
    const { semester_info, user_profile } = ctx;
    const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    return `## 学期信息
- 当前第 ${semester_info.current_week} 周 / 共 ${semester_info.total_weeks} 周
- 今天是 ${dayNames[semester_info.day_of_week] || '未知'}
- ${semester_info.is_exam_week ? '⚠️ 本周是考试周' : '非考试周'}
- ${semester_info.is_first_week ? '⚠️ 本周是开学第一周' : ''}
- plan_weeks：${ctx.plan_weeks} 周

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

    const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const courseList = ctx.courses.map(c =>
        `- id=${c.schedule_id} [${c.course_name}] ${dayNames[c.schedule_day]} ${c.schedule_period}节 | ${c.course_type} | ${c.study_mode} | ${c.rollcall_info.method}点名(${c.rollcall_info.frequency})`
    ).join('\n');

    return wrapMemoryContext(
        `## 课程列表\n${courseList}\n\n详细快照数据见上方记忆块。`
    );
}

// ── Layer 2: Risk Assessment Block ──
function formatRiskAssessmentBlock(ctx: StructuredPlanContext): string {
    if (ctx.courses.length === 0) return '';

    const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const riskList = ctx.courses.map(c => {
        let line = `- id=${c.schedule_id} ${c.course_name}(${dayNames[c.schedule_day]} ${c.schedule_period}节): ${c.risk_result.risk_level} | ${c.risk_result.risk_reason}`;
        if (c.risk_result.confidence != null) {
            line += ` | 置信度: ${(c.risk_result.confidence * 100).toFixed(0)}%`;
        }
        line += ` | 下次被抓概率: ${(c.risk_result.next_caught_probability * 100).toFixed(0)}%`;
        if (c.risk_result.disagreement_flag) {
            line += ` | ⚠ 评估分歧: ${c.risk_result.disagreement_flag.type}`;
        }
        return line;
    }).join('\n');

    return [
        '<risk-assessment-context>',
        '[System note: 以下为风险评估数据，非用户新输入]',
        '',
        `## 风险评估\n${riskList}`,
        '</risk-assessment-context>',
    ].join('\n');
}

// ── Main builder ──
// Only builds dynamic data blocks. All instruction content (role, rules, output format)
// lives in prompts/supervisor.md (system prompt).
export function buildSupervisorSystemPrompt(ctx: StructuredPlanContext): string {
    const blocks: string[] = [];

    // Block 1: Semester Context + User Profile
    blocks.push(formatSemesterContext(ctx));

    // Block 2: Course Memory Block (fenced)
    const memoryBlock = formatCourseMemoryBlock(ctx);
    blocks.push(memoryBlock || '<course-memory-context>\n[无课程数据]\n</course-memory-context>');

    // Block 3: Risk Assessment Block (fenced)
    const riskBlock = formatRiskAssessmentBlock(ctx);
    blocks.push(riskBlock || '<risk-assessment-context>\n[无风险评估数据]\n</risk-assessment-context>');

    // Retry hint if present (from smart retry)
    if (ctx.retry_hint) {
        blocks.push(`\n## ⚠️ 修正反馈\n${ctx.retry_hint}`);
    }

    return blocks.join('\n\n---\n\n');
}
