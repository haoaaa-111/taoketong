import type { RiskLevel, RuleResult } from './rule-engine';

export interface FusionResult {
    risk_level: RiskLevel;
    confidence: number;
    components: {
        rule_based: RuleResult;
        bayesian: { probability: number; trend: string };
        llm: { risk_level: RiskLevel; reason: string; key_signals: string[] };
    };
    disagreement_flag?: {
        type: 'rule_vs_llm' | 'bayes_vs_rule' | 'all_conflict';
        details: string;
        resolution: 'defer_to_rule' | 'defer_to_llm' | 'needs_review';
    };
}

function bayesToLevel(prob: number): RiskLevel {
    if (prob > 0.5) return '高风险';
    if (prob >= 0.3) return '中风险';
    return '低风险';
}

export function fuse(
    rule: RuleResult,
    bayes: { probability: number; trend: string },
    llm: { risk_level: RiskLevel; reason: string; key_signals?: string[] }
): FusionResult {
    let finalLevel: RiskLevel;
    let confidence: number;

    if (rule.priority >= 70) {
        finalLevel = rule.risk_level;
        confidence = 0.7 + rule.priority * 0.003;
    } else {
        finalLevel = llm.risk_level;
        confidence = 0.5;
    }

    const levels = new Set([rule.risk_level, llm.risk_level, bayesToLevel(bayes.probability)]);

    if (levels.size > 1 && rule.priority < 70) {
        return {
            risk_level: finalLevel,
            confidence: 0.4,
            components: {
                rule_based: rule,
                bayesian: { probability: bayes.probability, trend: bayes.trend },
                llm: { risk_level: llm.risk_level, reason: llm.reason, key_signals: llm.key_signals ?? [] },
            },
            disagreement_flag: {
                type: 'all_conflict',
                details: `Rule: ${rule.risk_level}, Bayes: ${bayesToLevel(bayes.probability)}, LLM: ${llm.risk_level}`,
                resolution: 'needs_review',
            },
        };
    }

    return {
        risk_level: finalLevel,
        confidence: Math.min(1, confidence),
        components: {
            rule_based: rule,
            bayesian: { probability: bayes.probability, trend: bayes.trend },
            llm: { risk_level: llm.risk_level, reason: llm.reason, key_signals: llm.key_signals ?? [] },
        },
    };
}
