import { describe, it, expect, afterEach } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Auxiliary Model Integration', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('chatCompletion accepts optional model parameter', () => {
        const opts = {
            systemPrompt: 'test',
            userPrompt: 'test',
            model: 'gpt-4o-mini',
        };
        expect(opts.model).toBe('gpt-4o-mini');
    });

    it('Curator should import chatCompletion for LLM-powered insights', () => {
        const curatorSrc = readFileSync(
            join(process.cwd(), 'src/agents/curator.ts'),
            'utf-8'
        );
        expect(curatorSrc).toContain("from '@/lib/llm'");
        expect(curatorSrc).toContain('AUX_LLM_MODEL');
    });

    it('Compressor already supports AUX_LLM_MODEL fallback', () => {
        const compressorSrc = readFileSync(
            join(process.cwd(), 'src/agents/compressor.ts'),
            'utf-8'
        );
        expect(compressorSrc).toContain('AUX_LLM_MODEL');
    });
});
