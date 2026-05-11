import { describe, it, expect, afterEach } from '@jest/globals';
import { getAgentModel } from '@/lib/llm';

describe('getAgentModel — executor and compressor circuitKeys', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('curator-review (executor)', () => {
        it('returns CURATOR_LLM_MODEL when set', () => {
            process.env.CURATOR_LLM_MODEL = 'custom-curator-model';
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('curator-review')).toBe('custom-curator-model');
        });

        it('falls back to LLM_MODEL when CURATOR_LLM_MODEL is not set', () => {
            delete process.env.CURATOR_LLM_MODEL;
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('curator-review')).toBe('base-model');
        });

        it('falls back to gpt-4o when neither CURATOR_LLM_MODEL nor LLM_MODEL is set', () => {
            delete process.env.CURATOR_LLM_MODEL;
            delete process.env.LLM_MODEL;
            expect(getAgentModel('curator-review')).toBe('gpt-4o');
        });
    });

    describe('compressor', () => {
        it('returns COMPRESSOR_LLM_MODEL when set', () => {
            process.env.COMPRESSOR_LLM_MODEL = 'custom-compressor-model';
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('compressor')).toBe('custom-compressor-model');
        });

        it('falls back to LLM_MODEL when COMPRESSOR_LLM_MODEL is not set', () => {
            delete process.env.COMPRESSOR_LLM_MODEL;
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('compressor')).toBe('base-model');
        });

        it('falls back to gpt-4o when neither COMPRESSOR_LLM_MODEL nor LLM_MODEL is set', () => {
            delete process.env.COMPRESSOR_LLM_MODEL;
            delete process.env.LLM_MODEL;
            expect(getAgentModel('compressor')).toBe('gpt-4o');
        });
    });
});
