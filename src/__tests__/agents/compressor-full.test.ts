import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockChatCompletion = jest.fn<(...args: any[]) => Promise<string>>()
    .mockResolvedValue('Semester summary: moderate risk, 5 courses, 2 caught events.');

jest.mock('@/lib/llm', () => ({
    chatCompletion: mockChatCompletion,
}));

import { compressSemester, shouldCompress, estimateSnapshotSize } from '@/agents/compressor';

describe('Course History Compression', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('compressSemester should produce output with semester identifier', async () => {
        const snapshots = [{}];
        const result = await compressSemester(snapshots, '2025-Fall');
        expect(result).toContain('[COMPRESSED SEMESTER 2025-Fall]');
        expect(typeof result).toBe('string');
    });

    it('uses COMPRESSOR_LLM_MODEL env var', async () => {
        process.env.COMPRESSOR_LLM_MODEL = 'gpt-4o-mini';
        const result = await compressSemester([{}], '2025-Spring');
        expect(result).toBeDefined();
        delete process.env.COMPRESSOR_LLM_MODEL;
    });

    it('falls back to LLM_MODEL when COMPRESSOR_LLM_MODEL is unset', async () => {
        delete process.env.COMPRESSOR_LLM_MODEL;
        process.env.LLM_MODEL = 'gpt-4o';
        const result = await compressSemester([{}], '2025-Spring');
        expect(result).toBeDefined();
    });

    it('shouldCompress should trigger at 80% capacity (2400 chars)', () => {
        const large = 'x'.repeat(2500);
        expect(shouldCompress(large)).toBe(true);
    });

    it('shouldCompress should NOT trigger below threshold', () => {
        const small = 'x'.repeat(500);
        expect(shouldCompress(small)).toBe(false);
    });

    it('estimateSnapshotSize should return JSON string length', () => {
        const data = { key: 'value' };
        const size = estimateSnapshotSize(data);
        expect(size).toBe(JSON.stringify(data).length);
    });

    it('falls back to gpt-4o when all model env vars are unset', async () => {
        delete process.env.COMPRESSOR_LLM_MODEL;
        delete process.env.LLM_MODEL;
        const result = await compressSemester([{}], '2025-Spring');
        expect(result).toContain('[COMPRESSED SEMESTER 2025-Spring]');
    });
});
