import { describe, it, expect } from '@jest/globals';
import { estimateSnapshotSize, shouldCompress } from '@/agents/compressor';

describe('Capacity Management', () => {
    it('should estimate snapshot size correctly', () => {
        const data = { test: 'hello'.repeat(100) };
        const size = estimateSnapshotSize(data);
        expect(size).toBeGreaterThan(100);
        expect(size).toBeLessThan(5000);
    });

    it('should trigger compression above 80% capacity (2400 chars)', () => {
        const largeData = 'x'.repeat(2500);
        expect(shouldCompress(largeData)).toBe(true);
    });

    it('should not trigger compression below 80% capacity', () => {
        const smallData = 'x'.repeat(1000);
        expect(shouldCompress(smallData)).toBe(false);
    });

    it('should force compression at 100% capacity (3000 chars)', () => {
        const hugeData = 'x'.repeat(3100);
        expect(shouldCompress(hugeData)).toBe(true);
    });

    it('should handle empty data gracefully', () => {
        expect(shouldCompress('')).toBe(false);
        expect(estimateSnapshotSize({})).toBeGreaterThan(0);
    });
});
