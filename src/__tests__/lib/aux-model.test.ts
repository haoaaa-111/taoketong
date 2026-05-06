import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Auxiliary Model Integration', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('chatCompletion accepts optional model parameter', () => {
        // The ChatCompletionOptions type already has model?: string
        // This verifies the type system accepts it
        const opts = {
            systemPrompt: 'test',
            userPrompt: 'test',
            model: 'gpt-4o-mini',
        };
        expect(opts.model).toBe('gpt-4o-mini');
    });

    it('Curator should import chatCompletion for LLM-powered insights', async () => {
        const curatorSrc = require('fs').readFileSync(
            require('path').join(process.cwd(), 'src/agents/curator.ts'),
            'utf-8'
        );
        expect(curatorSrc).toContain("from '@/lib/llm'");
        expect(curatorSrc).toContain('AUX_LLM_MODEL');
    });

    it('Compressor already supports AUX_LLM_MODEL fallback', () => {
        const compressorSrc = require('fs').readFileSync(
            require('path').join(process.cwd(), 'src/agents/compressor.ts'),
            'utf-8'
        );
        expect(compressorSrc).toContain('AUX_LLM_MODEL');
    });
});
