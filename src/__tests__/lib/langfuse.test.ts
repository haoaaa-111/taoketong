import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('langfuse wrapOpenAIClient', () => {
    beforeEach(async () => {
        jest.resetModules();
        delete process.env.LANGFUSE_SHALLOW_LOGGING;
        delete process.env.LANGFUSE_SECRET_KEY;
        delete process.env.LANGFUSE_PUBLIC_KEY;
        delete process.env.LANGFUSE_BASE_URL;
    });

    it('returns base client unchanged when SHALLOW_LOGGING is not "true"', async () => {
        process.env.LANGFUSE_SHALLOW_LOGGING = 'false';
        process.env.LANGFUSE_SECRET_KEY = 'sk-test';
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
        process.env.LANGFUSE_BASE_URL = 'https://test.com';

        const { wrapOpenAIClient } = await import('@/lib/langfuse');
        const fakeClient = { chat: { completions: { create: () => {} } } } as any;
        const result = await wrapOpenAIClient(fakeClient);
        expect(result).toBe(fakeClient);
    });

    it('returns base client unchanged when secret key is missing', async () => {
        process.env.LANGFUSE_SHALLOW_LOGGING = 'true';
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
        process.env.LANGFUSE_BASE_URL = 'https://test.com';

        const { wrapOpenAIClient } = await import('@/lib/langfuse');
        const fakeClient = { chat: { completions: { create: () => {} } } } as any;
        const result = await wrapOpenAIClient(fakeClient);
        expect(result).toBe(fakeClient);
    });

    it('returns base client unchanged when public key is missing', async () => {
        process.env.LANGFUSE_SHALLOW_LOGGING = 'true';
        process.env.LANGFUSE_SECRET_KEY = 'sk-test';
        process.env.LANGFUSE_BASE_URL = 'https://test.com';

        const { wrapOpenAIClient } = await import('@/lib/langfuse');
        const fakeClient = { chat: { completions: { create: () => {} } } } as any;
        const result = await wrapOpenAIClient(fakeClient);
        expect(result).toBe(fakeClient);
    });

    it('returns base client unchanged when base URL is missing', async () => {
        process.env.LANGFUSE_SHALLOW_LOGGING = 'true';
        process.env.LANGFUSE_SECRET_KEY = 'sk-test';
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';

        const { wrapOpenAIClient } = await import('@/lib/langfuse');
        const fakeClient = { chat: { completions: { create: () => {} } } } as any;
        const result = await wrapOpenAIClient(fakeClient);
        expect(result).toBe(fakeClient);
    });
});
