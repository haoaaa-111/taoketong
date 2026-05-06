import { describe, it, expect } from '@jest/globals';
import { decayWeight, estimateSnapshotSize, shouldCompress } from '@/agents/compressor';

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

describe('decayWeight', () => {
    it('should return max weight (2.0) for recent observations (≤4 weeks)', () => {
        expect(decayWeight(1, 1)).toBe(2.0); // same week
        expect(decayWeight(4, 8)).toBe(2.0); // exactly 4 weeks ago
        expect(decayWeight(5, 5)).toBe(2.0); // same week edge
    });

    it('should exponentially decay for observations >4 weeks old', () => {
        const weight5 = decayWeight(5, 10); // 5 weeks ago
        const weight10 = decayWeight(10, 20); // 10 weeks ago
        expect(weight5).toBeLessThan(2.0);
        expect(weight10).toBeLessThan(weight5); // decay continues
    });

    it('should never decay below 0.3', () => {
        const veryOld = decayWeight(1, 100); // 99 weeks ago
        expect(veryOld).toBeGreaterThanOrEqual(0.3);
    });
});
