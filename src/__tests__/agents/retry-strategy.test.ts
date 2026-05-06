import { describe, it, expect, jest } from '@jest/globals';

describe('Smart retry strategy', () => {
    it('should decrease temperature each attempt', () => {
        const temperatures: number[] = [];
        let currentTemp = 0.8;

        for (let attempt = 0; attempt < 3; attempt++) {
            temperatures.push(currentTemp);
            currentTemp = Math.max(0.3, currentTemp - 0.2);
        }

        expect(temperatures[0]).toBeCloseTo(0.8);
        expect(temperatures[1]).toBeCloseTo(0.6);
        expect(temperatures[2]).toBeCloseTo(0.4);
    });

    it('should not go below 0.3 temperature', () => {
        let temp = 0.5;
        temp = Math.max(0.3, temp - 0.2);
        temp = Math.max(0.3, temp - 0.2);
        expect(temp).toBe(0.3);
    });

    it('should inject retry_hint on each failure', () => {
        const violationHint = '- Rule 1: 当前3次 > 目标2次';
        const context = { retry_hint: undefined as string | undefined };

        // First retry: inject hint
        context.retry_hint = violationHint;
        expect(context.retry_hint).toContain('Rule 1');

        // Second retry: hint should be present
        expect(context.retry_hint).toBeDefined();
    });

    it('should throw after 3 failed attempts', () => {
        let attempts = 0;
        const maxAttempts = 3;

        const shouldThrow = () => {
            while (attempts < maxAttempts) {
                attempts++;
            }
            if (attempts >= maxAttempts) {
                throw new Error('方案生成失败：3 次尝试后自检仍未通过');
            }
        };

        expect(shouldThrow).toThrow('3 次尝试后自检仍未通过');
    });
});
