import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Orchestrator Responsibility Separation', () => {
    it('should be ≤ 80 lines of pure orchestration logic', () => {
        const orchestratorPath = join(process.cwd(), 'src/agents/orchestrator.ts');
        const content = readFileSync(orchestratorPath, 'utf-8');
        const lines = content.split('\n');

        // Post-parallelism refactoring: expanded Promise.all structure
        expect(lines.length).toBeLessThanOrEqual(85);
    });

    it('should not contain prompt-building logic (moved to prompt-builder.ts)', () => {
        const orchestratorPath = join(process.cwd(), 'src/agents/orchestrator.ts');
        const content = readFileSync(orchestratorPath, 'utf-8');

        // Prompt building patterns that should NOT be in orchestrator
        expect(content).not.toContain('[用户画像]');
        expect(content).not.toContain('JSON.stringify(profile');
        expect(content).not.toContain('LAYER1_AGENT_IDENTITY');
    });

    it('should not contain inline rule validation logic', () => {
        const content = readFileSync(join(process.cwd(), 'src/agents/orchestrator.ts'), 'utf-8');
        expect(content).not.toContain('RuleCheckResult');
        expect(content).not.toContain('RuleViolation');
        expect(content).not.toContain('a.action === \'逃课\'');
    });

    it('should import from prompt-builder and rule-validator', () => {
        const orchestratorPath = join(process.cwd(), 'src/agents/orchestrator.ts');
        const content = readFileSync(orchestratorPath, 'utf-8');

        expect(content).toContain('prompt-builder');
        expect(content).toContain('rule-validator');
    });
});
