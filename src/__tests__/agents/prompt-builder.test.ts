import { describe, it, expect } from '@jest/globals';
import { buildSupervisorSystemPrompt } from '@/agents/prompt-builder';
import type { StructuredPlanContext } from '@/types';

const minimalContext: StructuredPlanContext = {
    user_profile: {
        risk_tolerance: '中等',
        weekly_skip_target: 2,
        study_mode: '上课学习',
        escape_rush_accept: false,
        constraints: [],
    },
    semester_info: {
        current_week: 5,
        day_of_week: 3,
        is_exam_week: false,
        is_first_week: false,
        total_weeks: 16,
    },
    courses: [],
};

describe('buildSupervisorSystemPrompt', () => {
    it('should produce a non-empty string', () => {
        const prompt = buildSupervisorSystemPrompt(minimalContext);
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(100);
    });

    it('should contain all 6 layers', () => {
        const prompt = buildSupervisorSystemPrompt(minimalContext);

        // Layer markers (check for section content)
        const layerChecks = [
            '排课主管',            // Layer 1: Identity
            '学期',               // Layer 2: Context
            'course-memory',      // Layer 3: Memory block
            'risk-assessment',    // Layer 4: Risk block
            '规则',               // Layer 5: Self-check rules
            '行为',               // Layer 6: Behavior guidance
        ];

        for (const check of layerChecks) {
            expect(prompt.toLowerCase()).toContain(check.toLowerCase());
        }
    });

    it('should fence memory blocks with appropriate tags', () => {
        const ctx = {
            ...minimalContext,
            courses: [{
                schedule_id: 1,
                course_id: 1,
                course_name: '高数',
                course_type: '专业课',
                study_mode: '上课学习',
                schedule_day: 1,
                schedule_period: '1-2',
                schedule_weeks: [1, 2, 3, 4, 5, 6, 7, 8],
                risk_result: {
                    risk_level: '中风险' as const,
                    risk_reason: '偶尔点名',
                    next_caught_probability: 0.3,
                },
                rollcall_info: {
                    method: '随机点名',
                    frequency: '偶尔',
                },
                is_first_class: false,
                constraints: [],
            }],
        };

        const prompt = buildSupervisorSystemPrompt(ctx);
        expect(prompt).toContain('<course-memory-context>');
        expect(prompt).toContain('</course-memory-context>');
        expect(prompt).toContain('<risk-assessment-context>');
        expect(prompt).toContain('</risk-assessment-context>');
    });

    it('should not duplicate content across layers', () => {
        const prompt = buildSupervisorSystemPrompt(minimalContext);
        const lines = prompt.split('\n');
        const nonEmptyLines = lines.filter(l => l.trim().length > 0);
        const uniqueLines = new Set(nonEmptyLines);

        // Most lines should be unique (allow some structure duplication)
        expect(uniqueLines.size).toBeGreaterThan(nonEmptyLines.length * 0.7);
    });
});
