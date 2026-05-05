const SNAPSHOT_LIMIT_CHARS = 3000;
const COMPRESSION_THRESHOLD = 0.8;

export function estimateSnapshotSize(data: unknown): number {
    return JSON.stringify(data).length;
}

export function shouldCompress(snapshotJson: string): boolean {
    if (!snapshotJson) return false;

    const size = snapshotJson.length;
    const utilization = size / SNAPSHOT_LIMIT_CHARS;

    if (utilization >= COMPRESSION_THRESHOLD) return true;

    if (size > SNAPSHOT_LIMIT_CHARS) return true;

    return false;
}

export function decayWeight(weekNumber: number, currentWeek: number): number {
    const weeksAgo = currentWeek - weekNumber;
    if (weeksAgo <= 4) return 2.0;
    return Math.max(0.3, Math.exp(-0.1 * (weeksAgo - 4)));
}
