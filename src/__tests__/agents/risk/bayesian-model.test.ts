import { describe, it, expect } from '@jest/globals';
import { BayesianRollcallModel } from '@/agents/risk/bayesian-model';

describe('BayesianRollcallModel', () => {
    it('should initialize with Laplace smoothing priors', () => {
        const model = new BayesianRollcallModel(1, 1, 5);
        const prob = model.expectedProbability();
        expect(prob).toBe(0.5); // alpha=1, beta=1 → 0.5
    });

    it('should update probability after observing caught weeks', () => {
        const model = new BayesianRollcallModel(1, 1, 10);
        model.update(true, 3);   // caught at week 3
        model.update(false, 4);  // not caught at week 4
        model.update(true, 5);   // caught at week 5

        const prob = model.expectedProbability();
        // alpha=1+2(w)*2=5, beta=1+1(w)*2=3 → 5/8=0.625
        expect(prob).toBeGreaterThan(0.5);
    });

    it('should apply time decay to old observations', () => {
        const model = new BayesianRollcallModel(1, 1, 16);
        model.update(true, 1);   // week 1, 15 weeks ago → weight ~0.3
        model.update(true, 14);  // week 14, 2 weeks ago → weight 2.0

        // Recent observation should dominate
        const prob = model.expectedProbability();
        expect(prob).toBeGreaterThan(0.5);
    });

    it('should produce valid credible interval', () => {
        const model = new BayesianRollcallModel(5, 5, 10);
        const ci = model.credibleInterval();
        expect(ci.lower).toBeGreaterThanOrEqual(0);
        expect(ci.upper).toBeLessThanOrEqual(1);
        expect(ci.lower).toBeLessThan(ci.upper);
    });

    it('should detect increasing trend with many catches', () => {
        const model = new BayesianRollcallModel(10, 5, 10); // alpha >> beta
        expect(model.trend()).toBe('increasing');
    });

    it('should detect decreasing trend with few catches', () => {
        const model = new BayesianRollcallModel(2, 20, 10); // beta >> alpha
        expect(model.trend()).toBe('decreasing');
    });

    it('should report stable when insufficient data', () => {
        const model = new BayesianRollcallModel(1, 1, 10); // just priors
        expect(model.trend()).toBe('stable');
    });

    it('should build from history data correctly', () => {
        const model = BayesianRollcallModel.fromHistory(
            [3, 5],        // caught at weeks 3 and 5
            [1, 2, 3, 4, 5, 6, 7, 8], // observed weeks 1-8
            10             // current week
        );
        const prob = model.expectedProbability();
        expect(prob).toBeGreaterThan(0);
        expect(prob).toBeLessThan(1);
    });

    it('should serialize to JSON correctly', () => {
        const model = new BayesianRollcallModel(3, 7, 10);
        const json = model.toJSON();
        expect(json).toHaveProperty('alpha');
        expect(json).toHaveProperty('beta');
        expect(json).toHaveProperty('expected_probability');
        expect(json).toHaveProperty('credible_interval');
        expect(json).toHaveProperty('trend');
    });

    it('decayWeight should give recent weeks higher weight', () => {
        const model = new BayesianRollcallModel(1, 1, 10);
        expect(model.getDecayWeight(9, 10)).toBe(2.0); // 1 week ago
        expect(model.getDecayWeight(1, 10)).toBeLessThan(1.0); // 9 weeks ago
    });
});
