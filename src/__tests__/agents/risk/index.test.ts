import { describe, it, expect } from '@jest/globals';
import { BayesianRollcallModel, evaluateRules, fuse } from '@/agents/risk';

describe('Risk module index', () => {
    it('should export BayesianRollcallModel as a class', () => {
        expect(typeof BayesianRollcallModel).toBe('function');
        const instance = new BayesianRollcallModel(1, 1, 10);
        expect(instance).toBeInstanceOf(BayesianRollcallModel);
    });

    it('should export evaluateRules as a function', () => {
        expect(typeof evaluateRules).toBe('function');
    });

    it('should export fuse as a function', () => {
        expect(typeof fuse).toBe('function');
    });
});
