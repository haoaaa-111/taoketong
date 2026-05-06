import { describe, it, expect } from '@jest/globals';
import { PatternLearner } from '@/agents/pattern-learner';

describe('PatternLearner', () => {
    it('should detect rollcall frequency increase when recent catches double', () => {
        const learner = new PatternLearner(10);
        const feedbacks = [
            { course_id: 1, week_number: 3, was_caught: false },
            { course_id: 1, week_number: 4, was_caught: false },
            { course_id: 1, week_number: 7, was_caught: true },
            { course_id: 1, week_number: 8, was_caught: true },
            { course_id: 1, week_number: 9, was_caught: true },
        ];

        const shifts = learner.detectPatternShifts(feedbacks);
        expect(shifts.length).toBeGreaterThan(0);
        expect(shifts[0].shift_type).toBe('rollcall_frequency_increase');
        expect(shifts[0].confidence).toBe(0.7);
    });

    it('should NOT detect shift when increase is minor', () => {
        const learner = new PatternLearner(10);
        const feedbacks = [
            { course_id: 1, week_number: 3, was_caught: true },
            { course_id: 1, week_number: 7, was_caught: true },
        ];

        const shifts = learner.detectPatternShifts(feedbacks);
        expect(shifts).toHaveLength(0);
    });

    it('should detect over-estimation bias in calibration', () => {
        const learner = new PatternLearner(10);
        const predictions = [
            { course_id: 1, predicted_risk: 0.8, week: 5 },
        ];
        const outcomes = [
            { course_id: 1, was_caught: false, week: 5 },
        ];

        const result = learner.calibrateRiskModel(predictions, outcomes);
        expect(result.overall_bias).toBeGreaterThan(0.5);
        expect(result.recommendations[0]).toContain('高估');
    });

    it('should detect under-estimation bias', () => {
        const learner = new PatternLearner(10);
        const predictions = [
            { course_id: 1, predicted_risk: 0.1, week: 5 },
        ];
        const outcomes = [
            { course_id: 1, was_caught: true, week: 5 },
        ];

        const result = learner.calibrateRiskModel(predictions, outcomes);
        expect(result.overall_bias).toBeLessThan(-0.5);
        expect(result.recommendations[0]).toContain('低估');
    });

    it('should report well-calibrated model', () => {
        const learner = new PatternLearner(10);
        const predictions = [
            { course_id: 1, predicted_risk: 0.5, week: 5 },
        ];
        const outcomes = [
            { course_id: 1, was_caught: true, week: 5 },
        ];

        const result = learner.calibrateRiskModel(predictions, outcomes);
        expect(Math.abs(result.overall_bias)).toBeLessThanOrEqual(0.5);
    });
});
