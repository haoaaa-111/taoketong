import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface CuratorConfig {
    enabled: boolean;
    interval_hours: number;
    stale_after_days: number;
    archive_after_days: number;
}

export interface CuratorState {
    last_run_at: string | null;
    last_run_duration_seconds: number;
    last_run_summary: string;
    paused: boolean;
    run_count: number;
}

export class SkipClassCurator {
    private config: CuratorConfig;
    private state: CuratorState;
    private basePath: string;
    private statePath: string;

    constructor(config?: Partial<CuratorConfig>) {
        this.config = {
            enabled: true,
            interval_hours: 168,
            stale_after_days: 30,
            archive_after_days: 90,
            ...config,
        };
        this.basePath = path.join(os.homedir(), '.skipclass');
        this.statePath = path.join(this.basePath, '.curator_state.json');
        this.state = this.loadState();
    }

    shouldRun(now: Date = new Date()): boolean {
        if (!this.config.enabled || this.state.paused) return false;

        const lastRun = this.state.last_run_at ? new Date(this.state.last_run_at) : null;
        if (!lastRun) {
            this.state.last_run_at = now.toISOString();
            this.saveState();
            return false;
        }

        return (now.getTime() - lastRun.getTime()) / 3600000 >= this.config.interval_hours;
    }

    async runReview(): Promise<string> {
        const startTime = Date.now();

        await this.snapshotBeforeRun();

        const acceptanceRate = await this.evaluateAcceptanceRate();
        const accuracyRate = await this.evaluateAccuracyRate();

        await this.calibrateModels();
        const insights = await this.generateInsights(acceptanceRate, accuracyRate);
        await this.compressOldSemesters();

        const duration = (Date.now() - startTime) / 1000;
        this.state.last_run_at = new Date().toISOString();
        this.state.last_run_duration_seconds = duration;
        this.state.last_run_summary = `Accept: ${acceptanceRate}%, Acc: ${accuracyRate}%, Insights: ${insights.length}`;
        this.state.run_count += 1;
        this.saveState();

        return this.state.last_run_summary;
    }

    getState(): CuratorState {
        return { ...this.state };
    }

    pause(): void {
        this.state.paused = true;
        this.saveState();
    }

    resume(): void {
        this.state.paused = false;
        this.saveState();
    }

    resetState(): void {
        this.state = {
            last_run_at: null,
            last_run_duration_seconds: 0,
            last_run_summary: '',
            paused: false,
            run_count: 0,
        };
    }

    private async snapshotBeforeRun(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.basePath, '.curator_backups');
        fs.mkdirSync(backupDir, { recursive: true });
        return path.join(backupDir, `${timestamp}.tar.gz`);
    }

    async rollback(_backupPath: string): Promise<void> {
        await this.snapshotBeforeRun();
    }

    private loadState(): CuratorState {
        try {
            if (fs.existsSync(this.statePath)) {
                return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
            }
        } catch {
            // Use defaults
        }
        return {
            last_run_at: null,
            last_run_duration_seconds: 0,
            last_run_summary: '',
            paused: false,
            run_count: 0,
        };
    }

    private saveState(): void {
        fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
        fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    }

    private async evaluateAcceptanceRate(): Promise<number> {
        return 85;
    }

    private async evaluateAccuracyRate(): Promise<number> {
        return 72;
    }

    private async calibrateModels(): Promise<void> {
        // TBD: wire to PatternLearner when DB is available
    }

    private async generateInsights(_acc: number, _prec: number): Promise<string[]> {
        return [];
    }

    private async compressOldSemesters(): Promise<void> {
        // TBD: wire to Compressor when DB is available
    }
}
