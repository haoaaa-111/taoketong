import { chatCompletionJSON } from '@/lib/llm';
import { readFileSync } from 'fs';
import { z } from 'zod';
import type { StructuredPlanContext, ReviewResult } from '@/types';

const SYSTEM_PROMPT = readFileSync(
    process.cwd() + '/prompts/supervisor-review.md',
    'utf-8'
);

const ReviewQuestionSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    context: z.string(),
    type: z.enum(['choice', 'open']),
    options: z.array(z.string()).optional(),
});

const ReviewResultSchema = z.object({
    is_sufficient: z.boolean(),
    assessment: z.string(),
    questions: z.array(ReviewQuestionSchema).max(5),
});

export function runPreCheck(ctx: StructuredPlanContext): ReviewResult | null {
    const courseCount = ctx.courses.length;
    if (courseCount === 0) return null;

    const unknownRollcall = ctx.courses.filter(c => c.rollcall_info.method === '未知').length;
    const uncertainType = ctx.courses.filter(c => c.course_type === '不确定').length;
    const lowConfidence = ctx.courses.filter(
        c => c.risk_result.confidence != null && c.risk_result.confidence < 0.5
    ).length;
    const noMotivation = !ctx.user_profile.constraints?.length &&
        !(ctx.user_profile as any).skip_motivation?.length;

    if (
        unknownRollcall > courseCount / 2 &&
        uncertainType > courseCount / 2 &&
        noMotivation
    ) {
        const reasons: string[] = [];
        const questions: any[] = [];

        if (unknownRollcall > courseCount / 2) {
            reasons.push(`${unknownRollcall}/${courseCount} 门课程的点名方式未知`);
            const courseNames = ctx.courses
                .filter(c => c.rollcall_info.method === '未知')
                .map(c => c.course_name);
            questions.push({
                id: 'q_rollcall_methods',
                text: `以下课程的点名方式是怎样的？${courseNames.join('、')}`,
                context: '点名方式影响风险评估，至少需要知道大概频率',
                type: 'choice' as const,
                options: ['全点名', '随机点名', '偶尔点名', '从不点名', '不确定'],
            });
        }

        if (uncertainType > courseCount / 2) {
            reasons.push(`${uncertainType}/${courseCount} 门课程的类型不确定`);
            questions.push({
                id: 'q_course_types',
                text: '这些课程中哪些是水课、哪些是专业课？请逐个说明',
                context: '课程类型影响逃课策略：水课可以大胆逃，专业课需要保守',
                type: 'open' as const,
            });
        }

        if (noMotivation) {
            reasons.push('未填写逃课动机');
            questions.push({
                id: 'q_skip_motivation',
                text: '你逃课主要是为了做什么？',
                context: '不同动机会影响哪些课可以逃、哪些必须去',
                type: 'choice' as const,
                options: ['考研', '考公', '自学', '实习', '娱乐', '单纯想逃'],
            });
        }

        return {
            is_sufficient: false,
            assessment: `数据严重不足（${reasons.join('；')}），在生成方案前请补充以下信息。`,
            questions: questions.slice(0, 5),
        };
    }

    if (lowConfidence > courseCount / 2) {
        return {
            is_sufficient: false,
            assessment: `超过半数课程（${lowConfidence}/${courseCount}）的风险评估置信度不足50%，可能因为课程信息不够详细。`,
            questions: [{
                id: 'q_low_confidence',
                text: '以下课程的点名规律需要更详细的信息，你了解这些老师的具体点名习惯吗？',
                context: '低置信度意味着AI判断不太确定，需要你的实际经验来纠正',
                type: 'open' as const,
            }],
        };
    }

    return null;
}

export async function reviewContext(ctx: StructuredPlanContext): Promise<ReviewResult> {
    const preCheck = runPreCheck(ctx);
    if (preCheck) return preCheck;

    try {
        const userPrompt = buildReviewPrompt(ctx);
        const result = await chatCompletionJSON<ReviewResult>({
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            temperature: 0.5,
            schema: ReviewResultSchema,
            circuitKey: 'reviewer',
        });
        return result;
    } catch (e) {
        console.warn('[Reviewer] Review failed, proceeding without review:', e instanceof Error ? e.message : String(e));
        return {
            is_sufficient: true,
            assessment: '审查步骤跳过（服务暂时不可用）',
            questions: [],
        };
    }
}

function buildReviewPrompt(ctx: StructuredPlanContext): string {
    const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const lines: string[] = [];

    lines.push('## 用户画像');
    lines.push(`- 风险承受度：${ctx.user_profile.risk_tolerance}`);
    lines.push(`- 每周逃课目标：${ctx.user_profile.weekly_skip_target} 次`);
    lines.push(`- 学习模式：${ctx.user_profile.study_mode}`);
    lines.push(`- 签退模式：${ctx.user_profile.escape_rush_accept ? '已开启' : '未开启'}`);

    lines.push('');
    lines.push('## 学期信息');
    lines.push(`- 当前第 ${ctx.semester_info.current_week} 周 / 共 ${ctx.semester_info.total_weeks} 周`);
    lines.push(`- ${ctx.semester_info.is_exam_week ? '⚠️ 本周是考试周' : '非考试周'}`);

    lines.push('');
    lines.push('## 课程列表');
    for (const c of ctx.courses) {
        const riskConf = c.risk_result.confidence != null
            ? ` | 置信度: ${(c.risk_result.confidence * 100).toFixed(0)}%`
            : '';
        const disagree = c.risk_result.disagreement_flag
            ? ` | ⚠ 分歧: ${c.risk_result.disagreement_flag.type}`
            : '';
        lines.push(
            `- [${c.course_name}] ${dayNames[c.schedule_day]} ${c.schedule_period}节 | ` +
            `${c.course_type} | ${c.study_mode} | ` +
            `${c.rollcall_info.method}点名(${c.rollcall_info.frequency}) | ` +
            `风险: ${c.risk_result.risk_level}(${(c.risk_result.next_caught_probability * 100).toFixed(0)}%)` +
            `${riskConf}${disagree}`
        );
    }

    return lines.join('\n');
}
