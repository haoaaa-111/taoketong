export type RiskLevel = '无风险' | '低风险' | '中风险' | '高风险';

export interface RuleContext {
    is_exam_week: boolean;
    weeks_to_exam: number;
    is_first_class: boolean;
    rollcall_frequency: string;
    teacher_attitude: string;
    course_type: string;
    times_caught: number;
    observed_weeks: number;
}

export interface RuleResult {
    risk_level: RiskLevel;
    triggered_rules: string[];
    priority: number;
}

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
    const order: RiskLevel[] = ['无风险', '低风险', '中风险', '高风险'];
    return order.indexOf(a) > order.indexOf(b) ? a : b;
}

function minRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
    const order: RiskLevel[] = ['无风险', '低风险', '中风险', '高风险'];
    return order.indexOf(a) < order.indexOf(b) ? a : b;
}

export function evaluateRules(ctx: RuleContext): RuleResult {
    const triggered: string[] = [];
    let maxPriority = 0;
    let risk: RiskLevel = '低风险';
    let highPriorityTriggered = false;

    if (ctx.is_exam_week || ctx.weeks_to_exam === 1) {
        triggered.push('EXAM_PROXIMITY');
        maxPriority = Math.max(maxPriority, 90);
        risk = maxRisk(risk, '高风险');
        highPriorityTriggered = true;
    }

    if (ctx.is_first_class) {
        triggered.push('FIRST_CLASS');
        maxPriority = Math.max(maxPriority, 85);
        risk = maxRisk(risk, '高风险');
        highPriorityTriggered = true;
    }

    if (ctx.rollcall_frequency === '经常' && ctx.teacher_attitude === '严抓') {
        triggered.push('FREQUENT_ROLLCALL_STRICT');
        maxPriority = Math.max(maxPriority, 80);
        risk = maxRisk(risk, '高风险');
        highPriorityTriggered = true;
    }

    if (ctx.course_type === '水课' && ctx.teacher_attitude === '懒得管') {
        triggered.push('EASY_COURSE_LAZY_TEACHER');
        maxPriority = Math.max(maxPriority, 70);
        if (!highPriorityTriggered) {
            risk = '低风险';
        }
    }

    if (ctx.times_caught === 0 && ctx.observed_weeks > 8) {
        triggered.push('NEVER_CAUGHT_8WEEKS');
        maxPriority = Math.max(maxPriority, 50);
    }

    return { risk_level: risk, triggered_rules: triggered, priority: maxPriority };
}
