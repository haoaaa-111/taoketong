export class BayesianRollcallModel {
    private alpha: number;
    private beta: number;
    private currentWeek: number;

    constructor(priorAlpha: number = 1, priorBeta: number = 1, currentWeek: number = 1) {
        this.alpha = priorAlpha;
        this.beta = priorBeta;
        this.currentWeek = currentWeek;
    }

    static fromHistory(
        caughtWeeks: number[],
        observedWeeks: number[],
        currentWeek: number
    ): BayesianRollcallModel {
        const model = new BayesianRollcallModel(1, 1, currentWeek);
        const caughtSet = new Set(caughtWeeks);
        for (const week of observedWeeks) {
            model.update(caughtSet.has(week), week);
        }
        return model;
    }

    update(wasCaught: boolean, weekNumber: number): void {
        const weight = this.getDecayWeight(weekNumber, this.currentWeek);
        if (wasCaught) {
            this.alpha += weight;
        } else {
            this.beta += weight;
        }
    }

    getDecayWeight(weekNumber: number, currentWeek: number): number {
        const weeksAgo = currentWeek - weekNumber;
        if (weeksAgo <= 4) return 2.0;
        return Math.max(0.3, Math.exp(-0.25 * (weeksAgo - 4)));
    }

    expectedProbability(): number {
        return this.alpha / (this.alpha + this.beta);
    }

    credibleInterval(): { lower: number; upper: number } {
        const mean = this.expectedProbability();
        const total = this.alpha + this.beta;
        const std = Math.sqrt((this.alpha * this.beta) / (total * total * (total + 1)));
        return {
            lower: Math.max(0, mean - 1.96 * std),
            upper: Math.min(1, mean + 1.96 * std),
        };
    }

    trend(): 'increasing' | 'decreasing' | 'stable' {
        if (this.alpha < 3 && this.beta < 3) return 'stable';
        const prob = this.expectedProbability();
        if (prob > 0.4) return 'increasing';
        if (prob < 0.1) return 'decreasing';
        return 'stable';
    }

    toJSON() {
        return {
            alpha: this.alpha,
            beta: this.beta,
            expected_probability: this.expectedProbability(),
            credible_interval: this.credibleInterval(),
            trend: this.trend(),
        };
    }
}
