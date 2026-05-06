import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SkipClassCurator } from '@/agents/curator';

describe('SkipClassCurator', () => {
    let curator: SkipClassCurator;

    beforeEach(() => {
        curator = new SkipClassCurator({ enabled: true, interval_hours: 0 });
        // Reset state for test isolation (file persistence may carry over)
        curator.resetState();
    });

    it('should return false on first shouldRun call (seeds state, does not trigger)', () => {
        const now = new Date('2026-05-05T12:00:00Z');
        expect(curator.shouldRun(now)).toBe(false);
    });

    it('should return true after interval_hours elapsed', () => {
        const firstCall = new Date('2026-05-05T12:00:00Z');
        curator.shouldRun(firstCall);

        const later = new Date('2026-05-12T12:00:00Z');
        expect(curator.shouldRun(later)).toBe(true);
    });

    it('should NOT run when paused', () => {
        curator.pause();
        const now = new Date('2026-05-05T12:00:00Z');
        curator.shouldRun(now); // seed state

        const later = new Date('2026-05-12T12:00:00Z');
        expect(curator.shouldRun(later)).toBe(false);
    });

    it('should NOT run when disabled', () => {
        const disabled = new SkipClassCurator({ enabled: false, interval_hours: 0 });
        expect(disabled.shouldRun()).toBe(false);
    });

    it('runReview should complete and return summary string', async () => {
        const promise = curator.runReview();
        const result = await promise;
        expect(typeof result).toBe('string');
        expect(result).toContain('Accept:');
        expect(result).toContain('Acc:');
        expect(result).toContain('N/A'); // stubs return N/A
    });

    it('runReview should update state after completion', async () => {
        await curator.runReview();
        const state = curator.getState();
        expect(state.run_count).toBe(1);
        expect(state.last_run_at).not.toBeNull();
        expect(state.last_run_duration_seconds).toBeGreaterThanOrEqual(0);
    });

    it('resume should re-enable a paused curator', () => {
        curator.pause();
        expect(curator.getState().paused).toBe(true);
        curator.resume();
        expect(curator.getState().paused).toBe(false);
    });

    it('rollback should call snapshotBeforeRun without throwing', async () => {
        await expect(curator.rollback('/fake/path')).resolves.toBeUndefined();
    });

    it('should handle corrupt state file gracefully (catch branch in loadState)', () => {
        const statePath = path.join(os.homedir(), '.skipclass', '.curator_state.json');
        fs.mkdirSync(path.dirname(statePath), { recursive: true });
        fs.writeFileSync(statePath, 'this is not valid json {{{');

        const fresh = new SkipClassCurator();
        expect(fresh.getState().run_count).toBe(0);
        expect(fresh.getState().last_run_at).toBeNull();

        fresh.resetState();
    });
});
