import { chatCompletion } from '@/lib/llm';

const SUMMARY_RATIO = 0.20;
const SUMMARY_CEILING = 5000;
const COMPRESSION_THRESHOLD = 2400;

export interface SemesterStats {
    total_courses: number;
    total_skip_plans: number;
    total_caught: number;
    overall_risk: string;
    key_events: string[];
}

export async function compressSemester(
    snapshots: unknown[],
    semesterId: string
): Promise<string> {
    const stats = extractStats(snapshots);
    const prompt = buildCompressionPrompt(stats, semesterId);

    const maxTokens = Math.min(SUMMARY_CEILING, Math.floor(prompt.length * SUMMARY_RATIO));

    const summary = await chatCompletion({
        systemPrompt: '你是一个数据总结助手，负责将学期逃课数据压缩为简洁的统计摘要。',
        userPrompt: prompt,
        circuitKey: 'compressor',
        maxTokens,
    });

    return `[COMPRESSED SEMESTER ${semesterId}] ${summary}`;
}

export function shouldCompress(content: string): boolean {
    return content.length >= COMPRESSION_THRESHOLD;
}

export function estimateSnapshotSize(data: unknown): number {
    return JSON.stringify(data).length;
}

/**
 * Calculate observation weight with exponential decay for old observations.
 * - Observations ≤4 weeks old get max weight (2.0).
 * - Older observations decay exponentially: 2.0 * exp(-0.15 * (age - 4)).
 * - Weight never falls below 0.3.
 */
export function decayWeight(observationWeek: number, currentWeek: number): number {
    const age = Math.max(0, currentWeek - observationWeek);
    if (age <= 4) return 2.0;
    const weight = 2.0 * Math.exp(-0.15 * (age - 4));
    return Math.max(0.3, weight);
}

function extractStats(snapshots: unknown[]): SemesterStats {
    return {
        total_courses: snapshots.length,
        total_skip_plans: 0,
        total_caught: 0,
        overall_risk: '中风险',
        key_events: [],
    };
}

function buildCompressionPrompt(stats: SemesterStats, semesterId: string): string {
    return `总结以下学期的课程逃课数据：
学期: ${semesterId}
总课程数: ${stats.total_courses}
整体风险: ${stats.overall_risk}

请用 2-3 句话概括本学期的关键发现，包括点名趋势和风险水平。`;
}
