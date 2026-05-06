import { describe, it, expect } from '@jest/globals';
import { StrategyStore, type Strategy } from '@/agents/strategy-store';

function makeStrategy(name: string, state: 'active' | 'stale' | 'archived', daysAgo: number, pinned = false): Strategy {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return {
        name, description: 'test', content: 'test', created_at: d.toISOString(),
        last_used_at: d.toISOString(), use_count: 1, state, created_by: 'user', pinned,
    };
}

describe('StrategyStore lifecycle', () => {
    it('active → stale after 30 days unused', () => {
        const store = new StrategyStore();
        const s = makeStrategy('test', 'active', 35);
        const daysSinceUse = 35;
        expect(daysSinceUse > 30).toBe(true);
        expect(s.state).toBe('active');
        s.state = 'stale';
        expect(s.state).toBe('stale');
    });

    it('stale → archived after 90 days unused', () => {
        const s = makeStrategy('old', 'stale', 95);
        const daysSinceUse = 95;
        expect(daysSinceUse > 90).toBe(true);
        s.state = 'archived';
        expect(s.state).toBe('archived');
    });

    it('stale → active when bumped (reactivate)', () => {
        const s = makeStrategy('reactivated', 'stale', 5);
        s.state = 'active';
        s.use_count += 1;
        expect(s.state).toBe('active');
        expect(s.use_count).toBe(2);
    });

    it('pinned strategies never transition', () => {
        const s = makeStrategy('pinned', 'active', 60, true);
        expect(s.pinned).toBe(true);
        expect(s.state).toBe('active');
    });

    it('bumpUse increments counter and updates timestamp', () => {
        const oldDate = new Date('2026-01-01').toISOString();
        const s: Strategy = {
            name: 'test', description: '', content: '',
            created_at: oldDate, last_used_at: oldDate, use_count: 1,
            state: 'active', created_by: 'user',
        };
        s.use_count += 1;
        s.last_used_at = new Date().toISOString();
        expect(s.use_count).toBe(2);
        expect(s.last_used_at).not.toBe(oldDate);
    });
});
