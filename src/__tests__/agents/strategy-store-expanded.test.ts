import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const MOCK_HOMEDIR = '/mock/home';
const MOCK_STRATEGIES_DIR = `${MOCK_HOMEDIR}/.skipclass/strategies`;

let mockFiles: Map<string, string>;
let mockDirs: Set<string>;

const mockHomedir = jest.fn(() => MOCK_HOMEDIR);

const mockMkdirSync = jest.fn((dirPath: string, _options?: Record<string, unknown>) => {
    mockDirs.add(dirPath);
    return undefined;
});

const mockWriteFileSync = jest.fn((filePath: string, content: string) => {
    mockFiles.set(filePath, content);
    return undefined;
});

const mockReadFileSync = jest.fn((filePath: string, _encoding?: string) => {
    if (mockFiles.has(filePath)) {
        return mockFiles.get(filePath)!;
    }
    const err = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    (err as NodeJS.ErrnoException).code = 'ENOENT';
    throw err;
});

const mockReaddirSync = jest.fn((dirPath: string) => {
    if (!mockDirs.has(dirPath)) {
        const err = new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
        (err as NodeJS.ErrnoException).code = 'ENOENT';
        throw err;
    }
    const prefix = dirPath + '/';
    return Array.from(mockFiles.keys())
        .filter((f: string) => f.startsWith(prefix))
        .map((f: string) => f.slice(prefix.length));
});

jest.mock('os', () => ({ homedir: mockHomedir }));
jest.mock('fs', () => ({
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
}));

import { StrategyStore } from '@/agents/strategy-store';
import type { Strategy } from '@/agents/strategy-store';

function makeStrategy(overrides: Partial<Strategy> & { name: string }): Strategy {
    const now = new Date('2026-06-01T12:00:00Z');
    return {
        name: overrides.name,
        description: overrides.description ?? 'test description',
        content: overrides.content ?? 'test content',
        created_at: overrides.created_at ?? now.toISOString(),
        last_used_at: overrides.last_used_at ?? now.toISOString(),
        use_count: overrides.use_count ?? 1,
        state: overrides.state ?? 'active',
        created_by: overrides.created_by ?? 'user',
        pinned: overrides.pinned,
    };
}

function daysAgo(refDate: Date, days: number): Date {
    const d = new Date(refDate.getTime());
    d.setDate(d.getDate() - days);
    return d;
}

function persistStrategy(store: StrategyStore, strategy: Strategy): void {
    store.saveStrategy(strategy);
}

function readPersistedStrategy(name: string): Strategy {
    const filePath = `${MOCK_STRATEGIES_DIR}/${name}.json`;
    const content = mockFiles.get(filePath);
    if (!content) throw new Error(`File not found: ${filePath}`);
    return JSON.parse(content) as Strategy;
}

describe('StrategyStore', () => {
    let store: StrategyStore;

    beforeEach(() => {
        mockFiles = new Map<string, string>();
        mockDirs = new Set<string>();
        jest.clearAllMocks();
        store = new StrategyStore();
    });

    describe('constructor', () => {
        it('creates expected basePath using os.homedir', () => {
            expect(mockHomedir).toHaveBeenCalled();

            const strategy = makeStrategy({ name: 'constructor-test' });
            store.saveStrategy(strategy);

            expect(mockMkdirSync).toHaveBeenCalledWith(MOCK_STRATEGIES_DIR, { recursive: true });
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                `${MOCK_STRATEGIES_DIR}/constructor-test.json`,
                expect.any(String),
            );
        });
    });

    describe('saveStrategy', () => {
        it('creates the strategies directory and writes JSON file', () => {
            const strategy = makeStrategy({ name: 'save-test' });

            store.saveStrategy(strategy);

            expect(mockMkdirSync).toHaveBeenCalledWith(MOCK_STRATEGIES_DIR, { recursive: true });
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                `${MOCK_STRATEGIES_DIR}/save-test.json`,
                JSON.stringify(strategy, null, 2),
            );

            const persisted = readPersistedStrategy('save-test');
            expect(persisted.name).toBe('save-test');
            expect(persisted.state).toBe('active');
            expect(persisted.use_count).toBe(1);
            expect(persisted.created_by).toBe('user');
        });

        it('writes strategy with pinned flag when set', () => {
            const strategy = makeStrategy({ name: 'pinned-save', pinned: true });

            store.saveStrategy(strategy);

            const persisted = readPersistedStrategy('pinned-save');
            expect(persisted.pinned).toBe(true);
        });

        it('overwrites existing strategy file', () => {
            const original = makeStrategy({ name: 'overwrite', state: 'active', use_count: 1 });
            store.saveStrategy(original);

            const updated = makeStrategy({ name: 'overwrite', state: 'stale', use_count: 5 });
            store.saveStrategy(updated);

            const persisted = readPersistedStrategy('overwrite');
            expect(persisted.state).toBe('stale');
            expect(persisted.use_count).toBe(5);
        });
    });

    describe('loadStrategy', () => {
        it('returns parsed Strategy when file exists', () => {
            const strategy = makeStrategy({ name: 'load-test', state: 'stale', use_count: 3 });
            persistStrategy(store, strategy);

            const loaded = store.loadStrategy('load-test');

            expect(loaded).not.toBeNull();
            expect(loaded!.name).toBe('load-test');
            expect(loaded!.state).toBe('stale');
            expect(loaded!.use_count).toBe(3);
            expect(loaded!.description).toBe('test description');
            expect(loaded!.content).toBe('test content');
        });

        it('returns null when file does not exist', () => {
            const loaded = store.loadStrategy('nonexistent');
            expect(loaded).toBeNull();
        });

        it('returns null when strategy name has path separators', () => {
            const loaded = store.loadStrategy('does/not/exist');
            expect(loaded).toBeNull();
        });
    });

    describe('loadAll', () => {
        it('returns array of strategies from directory', () => {
            const s1 = makeStrategy({ name: 'alpha', state: 'active' });
            const s2 = makeStrategy({ name: 'beta', state: 'stale' });
            const s3 = makeStrategy({ name: 'gamma', state: 'archived' });

            persistStrategy(store, s1);
            persistStrategy(store, s2);
            persistStrategy(store, s3);

            const all = store.loadAll();

            expect(all).toHaveLength(3);
            const names = all.map(s => s.name).sort();
            expect(names).toEqual(['alpha', 'beta', 'gamma']);
        });

        it('returns empty array when directory does not exist', () => {
            const all = store.loadAll();

            expect(all).toEqual([]);
            expect(mockReaddirSync).toHaveBeenCalledWith(MOCK_STRATEGIES_DIR);
        });

        it('filters out non-JSON files from directory listing', () => {
            const strategy = makeStrategy({ name: 'real' });
            persistStrategy(store, strategy);

            mockFiles.set(`${MOCK_STRATEGIES_DIR}/notes.txt`, 'some text content');

            const all = store.loadAll();

            expect(all).toHaveLength(1);
            expect(all[0].name).toBe('real');
        });
    });

    describe('bumpUse', () => {
        it('increments use_count and updates last_used_at', () => {
            const oldDate = '2026-01-15T00:00:00Z';
            const strategy = makeStrategy({
                name: 'bump-test',
                use_count: 3,
                last_used_at: oldDate,
                state: 'active',
            });
            persistStrategy(store, strategy);

            store.bumpUse('bump-test');

            const persisted = readPersistedStrategy('bump-test');
            expect(persisted.use_count).toBe(4);
            expect(persisted.last_used_at).not.toBe(oldDate);
        });

        it('reactivates stale strategy back to active', () => {
            const strategy = makeStrategy({
                name: 'stale-reactivate',
                state: 'stale',
                use_count: 2,
                last_used_at: '2026-05-01T00:00:00Z',
            });
            persistStrategy(store, strategy);

            store.bumpUse('stale-reactivate');

            const persisted = readPersistedStrategy('stale-reactivate');
            expect(persisted.state).toBe('active');
            expect(persisted.use_count).toBe(3);
        });

        it('does nothing for non-existent strategy', () => {
            store.bumpUse('nonexistent');
            expect(mockFiles.size).toBe(0);
        });

        it('keeps archived strategy as archived when bumped', () => {
            const strategy = makeStrategy({
                name: 'archived-bump',
                state: 'archived',
                use_count: 10,
                last_used_at: '2025-12-01T00:00:00Z',
            });
            persistStrategy(store, strategy);

            store.bumpUse('archived-bump');

            const persisted = readPersistedStrategy('archived-bump');
            expect(persisted.state).toBe('archived');
            expect(persisted.use_count).toBe(11);
        });
    });

    describe('applyAutomaticTransitions', () => {
        const now = new Date('2026-06-01T12:00:00Z');

        it('marks active→stale after 30 days unused', () => {
            const strategy = makeStrategy({
                name: 'aging-active',
                state: 'active',
                last_used_at: daysAgo(now, 35).toISOString(),
            });
            persistStrategy(store, strategy);

            const stats = store.applyAutomaticTransitions(now);

            expect(stats.marked_stale).toBe(1);
            expect(stats.archived).toBe(0);
            expect(stats.reactivated).toBe(0);

            const persisted = readPersistedStrategy('aging-active');
            expect(persisted.state).toBe('stale');
        });

        it('marks stale→archived after 90 days unused', () => {
            const strategy = makeStrategy({
                name: 'aging-stale',
                state: 'stale',
                last_used_at: daysAgo(now, 95).toISOString(),
            });
            persistStrategy(store, strategy);

            const stats = store.applyAutomaticTransitions(now);

            expect(stats.archived).toBe(1);
            expect(stats.marked_stale).toBe(0);
            expect(stats.reactivated).toBe(0);

            const persisted = readPersistedStrategy('aging-stale');
            expect(persisted.state).toBe('archived');
        });

        it('reactivates stale→active if used less than 30 days ago', () => {
            const strategy = makeStrategy({
                name: 'recent-stale',
                state: 'stale',
                last_used_at: daysAgo(now, 10).toISOString(),
            });
            persistStrategy(store, strategy);

            const stats = store.applyAutomaticTransitions(now);

            expect(stats.reactivated).toBe(1);
            expect(stats.marked_stale).toBe(0);
            expect(stats.archived).toBe(0);

            const persisted = readPersistedStrategy('recent-stale');
            expect(persisted.state).toBe('active');
        });

        it('skips pinned strategies in transitions', () => {
            const pinned = makeStrategy({
                name: 'pinned-active',
                state: 'active',
                pinned: true,
                last_used_at: daysAgo(now, 60).toISOString(),
            });
            persistStrategy(store, pinned);

            const stats = store.applyAutomaticTransitions(now);

            expect(stats.marked_stale).toBe(0);
            expect(stats.archived).toBe(0);
            expect(stats.reactivated).toBe(0);

            const persisted = readPersistedStrategy('pinned-active');
            expect(persisted.state).toBe('active');
        });

        it('skips pinned stale strategies as well', () => {
            const pinnedStale = makeStrategy({
                name: 'pinned-stale',
                state: 'stale',
                pinned: true,
                last_used_at: daysAgo(now, 100).toISOString(),
            });
            persistStrategy(store, pinnedStale);

            const stats = store.applyAutomaticTransitions(now);

            expect(stats.archived).toBe(0);
            const persisted = readPersistedStrategy('pinned-stale');
            expect(persisted.state).toBe('stale');
        });

        it('returns correct stats for mixed batch', () => {
            const s1 = makeStrategy({ name: 's1', state: 'active', last_used_at: daysAgo(now, 40).toISOString() });
            const s2 = makeStrategy({ name: 's2', state: 'active', last_used_at: daysAgo(now, 10).toISOString() });
            const s3 = makeStrategy({ name: 's3', state: 'stale', last_used_at: daysAgo(now, 100).toISOString() });
            const s4 = makeStrategy({ name: 's4', state: 'stale', last_used_at: daysAgo(now, 5).toISOString() });
            const s5 = makeStrategy({ name: 's5', state: 'archived', last_used_at: daysAgo(now, 120).toISOString() });
            const s6 = makeStrategy({ name: 's6', state: 'active', last_used_at: daysAgo(now, 50).toISOString(), pinned: true });

            [s1, s2, s3, s4, s5, s6].forEach(s => persistStrategy(store, s));

            const stats = store.applyAutomaticTransitions(now);

            expect(stats.marked_stale).toBe(1);
            expect(stats.archived).toBe(1);
            expect(stats.reactivated).toBe(1);

            expect(readPersistedStrategy('s1').state).toBe('stale');
            expect(readPersistedStrategy('s2').state).toBe('active');
            expect(readPersistedStrategy('s3').state).toBe('archived');
            expect(readPersistedStrategy('s4').state).toBe('active');
            expect(readPersistedStrategy('s5').state).toBe('archived');
            expect(readPersistedStrategy('s6').state).toBe('active');
        });

        it('does not transition active strategy exactly at 30-day boundary', () => {
            const exactly30 = daysAgo(now, 30);
            const strategy = makeStrategy({
                name: 'boundary-30',
                state: 'active',
                last_used_at: exactly30.toISOString(),
            });
            persistStrategy(store, strategy);

            const stats = store.applyAutomaticTransitions(now);

            expect(stats.marked_stale).toBe(0);
            expect(readPersistedStrategy('boundary-30').state).toBe('active');
        });

        it('does not transition stale strategy exactly at 90-day boundary', () => {
            const exactly90 = daysAgo(now, 90);
            const strategy = makeStrategy({
                name: 'boundary-90',
                state: 'stale',
                last_used_at: exactly90.toISOString(),
            });
            persistStrategy(store, strategy);

            const stats = store.applyAutomaticTransitions(now);

            expect(stats.archived).toBe(0);
            expect(readPersistedStrategy('boundary-90').state).toBe('stale');
        });

        it('defaults now to current date when not provided', () => {
            const strategy = makeStrategy({
                name: 'default-now',
                state: 'active',
                last_used_at: '2020-01-01T00:00:00Z',
            });
            persistStrategy(store, strategy);

            const stats = store.applyAutomaticTransitions();

            expect(stats.marked_stale).toBe(1);
            expect(readPersistedStrategy('default-now').state).toBe('stale');
        });

        it('returns zeros when there are no strategies', () => {
            const stats = store.applyAutomaticTransitions(now);

            expect(stats.marked_stale).toBe(0);
            expect(stats.archived).toBe(0);
            expect(stats.reactivated).toBe(0);
        });
    });

    describe('full lifecycle', () => {
        it('save → load → bumpUse → transitions round-trip', () => {
            const now = new Date('2026-06-01T12:00:00Z');

            const strategy = makeStrategy({
                name: 'lifecycle',
                state: 'active',
                use_count: 1,
                last_used_at: daysAgo(now, 5).toISOString(),
            });
            store.saveStrategy(strategy);

            const loaded = store.loadStrategy('lifecycle');
            expect(loaded).not.toBeNull();
            expect(loaded!.name).toBe('lifecycle');

            store.bumpUse('lifecycle');
            const afterBump = readPersistedStrategy('lifecycle');
            expect(afterBump.use_count).toBe(2);
            expect(afterBump.last_used_at).not.toBe(strategy.last_used_at);

            const farFuture = new Date('2026-09-01T12:00:00Z');
            const stats = store.applyAutomaticTransitions(farFuture);
            expect(stats.marked_stale).toBe(1);

            const afterTransitions = readPersistedStrategy('lifecycle');
            expect(afterTransitions.state).toBe('stale');
        });

        it('loadAll results match individually loaded strategies', () => {
            const s1 = makeStrategy({ name: 'multi-1', state: 'active', use_count: 1 });
            const s2 = makeStrategy({ name: 'multi-2', state: 'stale', use_count: 5 });

            store.saveStrategy(s1);
            store.saveStrategy(s2);

            const all = store.loadAll();
            expect(all).toHaveLength(2);

            const individual1 = store.loadStrategy('multi-1');
            const individual2 = store.loadStrategy('multi-2');

            expect(individual1!.name).toBe(all.find(s => s.name === 'multi-1')!.name);
            expect(individual2!.state).toBe(all.find(s => s.name === 'multi-2')!.state);
        });
    });
});
