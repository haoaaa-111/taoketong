import { modelCourseRisk } from './modeler';
import type { ModelerOutput } from './modeler';

const DEFAULT_RISK: ModelerOutput = {
    risk_level: '中风险', risk_reason: '无法获取风险评估（降级默认值）', next_caught_probability: 0.3,
};

export async function modelAllCourses(
    courses: Array<{ courseId: number; snapshot: string }>
): Promise<Record<number, ModelerOutput>> {
    const results: Record<number, ModelerOutput> = {};
    await Promise.all(courses.map(async (c) => {
        try { results[c.courseId] = await modelCourseRisk(c.snapshot); }
        catch (e) { results[c.courseId] = { ...DEFAULT_RISK }; }
    }));
    return results;
}
