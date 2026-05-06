export interface PatternShift {
    course_id: number;
    course_name: string;
    shift_type: 'rollcall_frequency_increase' | 'teacher_attitude_change';
    detected_at_week: number;
    confidence: number;
    evidence: string;
}

export interface CalibrationResult {
    overall_bias: number;
    recommendations: string[];
}

interface WeeklyFeedback {
    course_id: number;
    week_number: number;
    was_caught: boolean;
}

export class PatternLearner {
    private currentWeek: number;

    constructor(currentWeek: number) {
        this.currentWeek = currentWeek;
    }

    detectPatternShifts(feedbacks: WeeklyFeedback[]): PatternShift[] {
        const shifts: PatternShift[] = [];
        const courseIds = [...new Set(feedbacks.map(f => f.course_id))];

        for (const courseId of courseIds) {
            const courseFbs = feedbacks.filter(f => f.course_id === courseId);
            const recent = courseFbs.filter(f => f.week_number > this.currentWeek - 4);
            const earlier = courseFbs.filter(
                f => f.week_number <= this.currentWeek - 4 && f.week_number > this.currentWeek - 8
            );

            const recentCaught = recent.filter(f => f.was_caught).length;
            const earlierCaught = earlier.filter(f => f.was_caught).length;

            if (recentCaught > earlierCaught * 2 && recentCaught >= 2) {
                shifts.push({
                    course_id: courseId,
                    course_name: `Course-${courseId}`,
                    shift_type: 'rollcall_frequency_increase',
                    detected_at_week: this.currentWeek,
                    confidence: 0.7,
                    evidence: `点名频率: ${earlierCaught}次(前4周) → ${recentCaught}次(近4周)`,
                });
            }
        }

        return shifts;
    }

    calibrateRiskModel(
        predictions: { course_id: number; predicted_risk: number; week: number }[],
        outcomes: { course_id: number; was_caught: boolean; week: number }[]
    ): CalibrationResult {
        const bias = predictions.reduce((sum, p) => {
            const outcome = outcomes.find(o => o.course_id === p.course_id && o.week === p.week);
            return sum + (p.predicted_risk - (outcome?.was_caught ? 1 : 0));
        }, 0) / (predictions.length || 1);

        return {
            overall_bias: bias,
            recommendations: bias > 0.2
                ? ['风险模型倾向高估风险，建议降低先验']
                : bias < -0.2
                    ? ['风险模型倾向低估风险，建议提高先验']
                    : ['风险模型校准良好'],
        };
    }
}
