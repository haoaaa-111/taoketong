import { describe, it, expect, beforeEach } from '@jest/globals';
import { MemoryManager } from '@/agents/memory-manager';
import type { MemoryProvider } from '@/agents/memory-provider';

function createMockProvider(name: string, shouldFail = false): MemoryProvider {
    return {
        name,
        isAvailable: () => true,
        initialize: jest.fn().mockResolvedValue(undefined),
        getToolSchemas: () => [],
        systemPromptBlock: () => `${name} system block`,
        prefetch: jest.fn().mockImplementation(async (query: string) => {
            if (shouldFail) throw new Error(`${name} prefetch failed`);
            return `${name}: prefetched "${query}"`;
        }),
        syncTurn: jest.fn().mockImplementation(async () => {
            if (shouldFail) throw new Error(`${name} sync failed`);
        }),
        shutdown: jest.fn().mockResolvedValue(undefined),
    } as unknown as MemoryProvider;
}

describe('MemoryManager', () => {
    let manager: MemoryManager;

    beforeEach(() => {
        manager = new MemoryManager();
    });

    it('should register providers', () => {
        const provider = createMockProvider('test');
        manager.registerProvider(provider);
        expect(() => manager.registerProvider(provider)).not.toThrow();
    });

    it('should prefetch from all providers and concatenate results', async () => {
        const p1 = createMockProvider('p1');
        const p2 = createMockProvider('p2');
        manager.registerProvider(p1);
        manager.registerProvider(p2);
        const result = await manager.prefetchAll('test query');
        expect(result).toContain('p1: prefetched');
        expect(result).toContain('p2: prefetched');
    });

    it('should isolate provider failures — one failing sync does not block others', async () => {
        const good = createMockProvider('good');
        const bad = createMockProvider('bad', true);
        const alsoGood = createMockProvider('also-good');
        manager.registerProvider(good);
        manager.registerProvider(bad);
        manager.registerProvider(alsoGood);
        await expect(manager.syncAll('user msg', 'asst msg')).resolves.not.toThrow();
        expect(good.syncTurn).toHaveBeenCalled();
        expect(alsoGood.syncTurn).toHaveBeenCalled();
    });

    it('buildSystemPromptBlock should combine all providers', () => {
        const p1 = createMockProvider('p1');
        const p2 = createMockProvider('p2');
        manager.registerProvider(p1);
        manager.registerProvider(p2);
        const block = manager.buildSystemPromptBlock();
        expect(block).toContain('p1 system block');
        expect(block).toContain('p2 system block');
    });

    it('wrapMemoryContext should fence text with course-memory-context tags', () => {
        const raw = 'some raw memory data';
        const fenced = MemoryManager.wrapMemoryContext(raw);
        expect(fenced).toContain('<course-memory-context>');
        expect(fenced).toContain('</course-memory-context>');
        expect(fenced).toContain(raw);
    });
});
