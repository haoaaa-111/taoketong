import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { chatCompletion } from '@/lib/llm';

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
        const accStr = acceptanceRate !== null ? `${acceptanceRate}%` : 'N/A';
        const precStr = accuracyRate !== null ? `${accuracyRate}%` : 'N/A';
        this.state.last_run_at = new Date().toISOString();
        this.state.last_run_duration_seconds = duration;
        this.state.last_run_summary = `Accept: ${accStr}, Acc: ${precStr}, Insights: ${insights.length}`;
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

    private async evaluateAcceptanceRate(): Promise<number | null> {
        return null; // STUB: wire to DB when sessions + feedback tables are available
    }

    private async evaluateAccuracyRate(): Promise<number | null> {
        return null; // STUB: wire to DB when weekly_feedback + plan_actions tables are available
    }

    private async calibrateModels(): Promise<void> {
        // TBD: wire to PatternLearner when DB is available
    }

    private async generateInsights(acc: number | null, prec: number | null): Promise<string[]> {
        try {
            const result = await chatCompletion({
                systemPrompt: '你是一个教学质量评估助手。',
                userPrompt: `根据以下数据生成改进建议：方案接受率=${acc ?? 'N/A'}%，准确率=${prec ?? 'N/A'}%。请返回不超过3条建议。`,
                temperature: 0.3,
                circuitKey: 'curator-review',
            });
            return result.split('\n').filter((s: string) => s.trim().length > 0).slice(0, 3);
        } catch {
            return [];
        }
    }

    private async compressOldSemesters(): Promise<void> {
        // TBD: wire to Compressor when DB is available
    }
}
