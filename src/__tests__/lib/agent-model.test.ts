import { describe, it, expect, afterEach } from '@jest/globals';
import { getAgentModel } from '@/lib/llm';

describe('getAgentModel', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('with specific circuitKey', () => {
        it('returns SUPERVISOR_LLM_MODEL when circuitKey is "supervisor" and env var is set', () => {
            process.env.SUPERVISOR_LLM_MODEL = 'custom-supervisor-model';
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('supervisor')).toBe('custom-supervisor-model');
        });

        it('falls back to LLM_MODEL when SUPERVISOR_LLM_MODEL is not set but LLM_MODEL is', () => {
            delete process.env.SUPERVISOR_LLM_MODEL;
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('supervisor')).toBe('base-model');
        });

        it('falls back to gpt-4o when neither SUPERVISOR_LLM_MODEL nor LLM_MODEL is set', () => {
            delete process.env.SUPERVISOR_LLM_MODEL;
            delete process.env.LLM_MODEL;
            expect(getAgentModel('supervisor')).toBe('gpt-4o');
        });

        it('returns MODELER_LLM_MODEL when circuitKey is "modeler" and env var is set', () => {
            process.env.MODELER_LLM_MODEL = 'custom-modeler-model';
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('modeler')).toBe('custom-modeler-model');
        });

        it('returns CURATOR_LLM_MODEL when circuitKey is "curator-review" and env var is set', () => {
            process.env.CURATOR_LLM_MODEL = 'custom-curator-model';
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('curator-review')).toBe('custom-curator-model');
        });
    });

    describe('with unknown circuitKey', () => {
        it('falls back to LLM_MODEL when circuitKey has no matching env var', () => {
            delete process.env.UNKNOWN_KEY_LLM_MODEL;
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel('unknown-key')).toBe('base-model');
        });

        it('falls back to gpt-4o when circuitKey has no match and LLM_MODEL is not set', () => {
            delete process.env.LLM_MODEL;
            expect(getAgentModel('unknown-key')).toBe('gpt-4o');
        });
    });

    describe('with no circuitKey', () => {
        it('returns LLM_MODEL when circuitKey is undefined and LLM_MODEL is set', () => {
            process.env.LLM_MODEL = 'base-model';
            expect(getAgentModel()).toBe('base-model');
        });

        it('returns gpt-4o when circuitKey is undefined and LLM_MODEL is not set', () => {
            delete process.env.LLM_MODEL;
            expect(getAgentModel()).toBe('gpt-4o');
        });
    });

    describe('env var precedence', () => {
        it('agent-specific env var takes precedence over LLM_MODEL', () => {
            process.env.SUPERVISOR_LLM_MODEL = 'supervisor-model';
            process.env.LLM_MODEL = 'default-model';
            expect(getAgentModel('supervisor')).toBe('supervisor-model');
        });

        it('different agent-specific env vars are independent', () => {
            process.env.SUPERVISOR_LLM_MODEL = 'supervisor-model';
            process.env.MODELER_LLM_MODEL = 'modeler-model';
            process.env.LLM_MODEL = 'default-model';
            expect(getAgentModel('supervisor')).toBe('supervisor-model');
            expect(getAgentModel('modeler')).toBe('modeler-model');
        });
    });
});
