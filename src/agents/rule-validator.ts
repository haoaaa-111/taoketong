// src/agents/rule-validator.ts

import type { StructuredPlanContext } from '@/types';

type ActionEntry = { schedule_id: number; week: number; action: string; reason: string };

export interface RuleCheckResult {
    rule_id: number;
    rule_name: string;
    passed: boolean;
    violations: RuleViolation[];
}

export interface RuleViolation {
    schedule_id: number;
    action: string;
    expected_action: string;
    reason: string;
}

/**
 * Run all 7 self-check rules against generated plan actions.
 * Returns results for each rule with violation details.
 */
export function runSelfChecks(
    actions: ActionEntry[],
    context: StructuredPlanContext
): RuleCheckResult[] {
    const checks: RuleCheckResult[] = [];

    // Rule 1: 逃课数限制 (per-week)
    const weekSkipCounts = new Map<number, number>();
    for (const a of actions) {
        if (a.action === '逃课') {
            weekSkipCounts.set(a.week, (weekSkipCounts.get(a.week) || 0) + 1);
        }
    }
    const skipViolations: RuleViolation[] = [];
    for (const [week, count] of weekSkipCounts) {
        if (count > context.user_profile.weekly_skip_target) {
            skipViolations.push({
                schedule_id: -1,
                action: '整体',
                expected_action: `逃课≤${context.user_profile.weekly_skip_target}次`,
                reason: `第${week}周逃课${count}次，超过目标`
            });
        }
    }
    checks.push({
        rule_id: 1,
        rule_name: '逃课数限制',
        passed: skipViolations.length === 0,
        violations: skipViolations
    });

    // Rule 2: 高风险专业课 + 上课学习 → 必须到课
    const highRiskViolations = actions
        .filter(a => a.action !== '上课')
        .filter(a => {
            const c = context.courses.find(co => co.schedule_id === a.schedule_id);
            return c
                && c.risk_result.risk_level === '高风险'
                && c.course_type === '专业课'
                && c.study_mode === '上课学习';
        })
        .map(a => ({
            schedule_id: a.schedule_id,
            action: a.action,
            expected_action: '上课',
            reason: '高风险专业课 + 上课学习模式 → 必须到课'
        }));
    checks.push({
        rule_id: 2,
        rule_name: '高风险专业课保守',
        passed: highRiskViolations.length === 0,
        violations: highRiskViolations
    });

    // Rule 3: 签退仅当 escape_rush_accept=true
    const escapeViolations = actions
        .filter(a => a.action === '签退')
        .filter(() => !context.user_profile.escape_rush_accept)
        .map(a => ({
            schedule_id: a.schedule_id,
            action: '签退',
            expected_action: '上课或逃课',
            reason: '用户未开启签退模式'
        }));
    checks.push({
        rule_id: 3,
        rule_name: '签退模式限制',
        passed: escapeViolations.length === 0,
        violations: escapeViolations
    });

    // Rule 4: 期考前后 → 上课
    const examViolations = actions
        .filter(a => a.action !== '上课')
        .filter(() => context.semester_info.is_exam_week)
        .map(a => ({
            schedule_id: a.schedule_id,
            action: a.action,
            expected_action: '上课',
            reason: '考试周 → 必须到课'
        }));
    checks.push({
        rule_id: 4,
        rule_name: '期考周保守',
        passed: examViolations.length === 0,
        violations: examViolations
    });

    // Rule 5: 第一次课 → 上课 (per-week: check if action.week is first of schedule_weeks)
    const firstClassViolations = actions
        .filter(a => a.action !== '上课')
        .filter(a => {
            const c = context.courses.find(co => co.schedule_id === a.schedule_id);
            return c && c.schedule_weeks.length > 0 && a.week === c.schedule_weeks[0];
        })
        .map(a => ({
            schedule_id: a.schedule_id,
            action: a.action,
            expected_action: '上课',
            reason: '本学期第一次课 → 必须到课'
        }));
    checks.push({
        rule_id: 5,
        rule_name: '第一次课必到',
        passed: firstClassViolations.length === 0,
        violations: firstClassViolations
    });

    // Rule 6: 第一周 → 逃课≤1 (per-week: check actions where week === 1)
    const firstWeekActions = actions.filter(a => a.week === 1);
    const firstWeekSkip = firstWeekActions.filter(a => a.action === '逃课').length;
    const firstWeekViolations = firstWeekSkip > 1
        ? [{
            schedule_id: -1,
            action: '整体',
            expected_action: '逃课≤1次',
            reason: `第一周逃课${firstWeekSkip}次 → 最多逃1次课`
          }]
        : [];
    checks.push({
        rule_id: 6,
        rule_name: '第一周保守',
        passed: firstWeekViolations.length === 0,
        violations: firstWeekViolations
    });

    // Rule 7: 用户约束「必须到课」
    const constraintViolations = actions
        .filter(a => a.action !== '上课')
        .filter(a => {
            const c = context.courses.find(co => co.schedule_id === a.schedule_id);
            return c?.constraints?.includes('必须到课');
        })
        .map(a => ({
            schedule_id: a.schedule_id,
            action: a.action,
            expected_action: '上课',
            reason: '用户设置了「必须到课」约束'
        }));
    checks.push({
        rule_id: 7,
        rule_name: '用户约束',
        passed: constraintViolations.length === 0,
        violations: constraintViolations
    });

    return checks;
}

/**
 * Format violation details into a retry hint string for LLM feedback.
 */
export function formatViolationsHint(checks: RuleCheckResult[]): string {
    const failures = checks.filter(c => !c.passed);
    if (failures.length === 0) return '';

    const lines = ['上一次方案违反了以下规则，请修正：'];
    for (const f of failures) {
        const vDetails = f.violations.map(v => v.reason).join('; ');
        lines.push(`- ${f.rule_name}: ${vDetails}`);
    }

    return lines.join('\n');
}
