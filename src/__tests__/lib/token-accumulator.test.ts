import { describe, it, expect, beforeEach } from '@jest/globals';

describe('token accumulator', () => {
    beforeEach(async () => {
        const { resetSessionTokens } = await import('@/lib/llm');
        resetSessionTokens();
    });

    it('resetSessionTokens zeros out the accumulator', async () => {
        const { getSessionTokens, resetSessionTokens } = await import('@/lib/llm');

        // First get should be zeros
        const t1 = getSessionTokens();
        expect(t1.input).toBe(0);
        expect(t1.output).toBe(0);

        // Reset should still be zeros
        resetSessionTokens();
        const t2 = getSessionTokens();
        expect(t2.input).toBe(0);
        expect(t2.output).toBe(0);
    });

    it('getSessionTokens returns a copy, not a reference', async () => {
        const { getSessionTokens } = await import('@/lib/llm');

        const t1 = getSessionTokens();
        t1.input = 999;

        const t2 = getSessionTokens();
        expect(t2.input).toBe(0);
        expect(t2).not.toBe(t1);
    });
});
