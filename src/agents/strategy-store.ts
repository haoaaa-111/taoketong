import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export type StrategyState = 'active' | 'stale' | 'archived';

export interface Strategy {
    name: string;
    description: string;
    content: string;
    created_at: string;
    last_used_at: string;
    use_count: number;
    state: StrategyState;
    created_by: 'user' | 'agent';
    pinned?: boolean;
}

export class StrategyStore {
    private basePath: string;

    constructor() {
        this.basePath = path.join(os.homedir(), '.skipclass', 'strategies');
    }

    applyAutomaticTransitions(now: Date = new Date()): {
        marked_stale: number;
        archived: number;
        reactivated: number;
    } {
        const strategies = this.loadAll();
        let markedStale = 0, archived = 0, reactivated = 0;

        for (const s of strategies) {
            if (s.pinned) continue;

            const daysSinceUse = (now.getTime() - new Date(s.last_used_at).getTime()) / 86400000;

            if (s.state === 'active' && daysSinceUse > 30) {
                s.state = 'stale';
                this.saveStrategy(s);
                markedStale++;
            } else if (s.state === 'stale' && daysSinceUse > 90) {
                s.state = 'archived';
                this.saveStrategy(s);
                archived++;
            } else if (s.state === 'stale' && daysSinceUse < 30) {
                s.state = 'active';
                this.saveStrategy(s);
                reactivated++;
            }
        }

        return { marked_stale: markedStale, archived, reactivated };
    }

    bumpUse(name: string): void {
        const s = this.loadStrategy(name);
        if (s) {
            s.use_count += 1;
            s.last_used_at = new Date().toISOString();
            if (s.state === 'stale') s.state = 'active';
            this.saveStrategy(s);
        }
    }

    saveStrategy(strategy: Strategy): void {
        fs.mkdirSync(this.basePath, { recursive: true });
        const filePath = path.join(this.basePath, `${strategy.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(strategy, null, 2));
    }

    loadStrategy(name: string): Strategy | null {
        const filePath = path.join(this.basePath, `${name}.json`);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as Strategy;
        } catch {
            return null;
        }
    }

    loadAll(): Strategy[] {
        try {
            const files = fs.readdirSync(this.basePath);
            return files
                .filter(f => f.endsWith('.json'))
                .map(f => {
                    const content = fs.readFileSync(path.join(this.basePath, f), 'utf-8');
                    return JSON.parse(content) as Strategy;
                });
        } catch {
            return [];
        }
    }
}
