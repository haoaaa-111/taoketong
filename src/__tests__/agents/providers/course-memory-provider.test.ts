import { describe, it, expect, beforeEach } from '@jest/globals';
import { CourseMemoryProvider } from '@/agents/providers/course-memory-provider';
import { initDatabase } from '@/db';

describe('CourseMemoryProvider', () => {
    let provider: CourseMemoryProvider;

    beforeAll(() => {
        initDatabase();
    });

    beforeEach(() => {
        provider = new CourseMemoryProvider();
    });

    it('should have the correct name', () => {
        expect(provider.name).toBe('builtin-course-memory');
    });

    it('should be available', () => {
        expect(provider.isAvailable()).toBe(true);
    });

    it('should return a system prompt block', () => {
        const block = provider.systemPromptBlock();
        expect(typeof block).toBe('string');
        expect(block.length).toBeGreaterThan(0);
    });

    it('should prefetch course snapshots as JSON', async () => {
        await provider.initialize('test-session', {
            dbPath: ':memory:',
            userId: 1,
        });
        const data = await provider.prefetch('current courses');
        expect(typeof data).toBe('string');
        const parsed = JSON.parse(data);
        expect(Array.isArray(parsed)).toBe(true);
    });

    it('should return empty array when no courses exist', async () => {
        await provider.initialize('empty-session', {
            dbPath: ':memory:',
            userId: 999,
        });
        const data = await provider.prefetch('current courses');
        const parsed = JSON.parse(data);
        expect(parsed).toEqual([]);
    });
});
