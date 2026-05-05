import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@/lib/llm', () => ({
    chatCompletionJSON: jest.fn().mockResolvedValue({
        updates: [
            {
                course_name: '高等数学',
                fields_to_update: { rollcall_method: '签到', teacher_attitude: '严抓' },
                confidence: 0.85,
                requires_verification: false,
                update_type: 'fact' as const,
            },
        ],
        summary: 'Updated rollcall info for 高等数学',
        detected_patterns: ['rollcall_frequency_increase'],
        suggested_actions: ['monitor this course closely next week'],
    }),
}));

import { parseUserInput } from '@/agents/memory';

describe('Memory Agent: parseUserInput', () => {
    it('should parse adjustment notes into structured updates', async () => {
        const result = await parseUserInput(
            '高等数学老师开始签到了，抓得很严'
        );

        expect(result.updates).toHaveLength(1);
        expect(result.updates[0].course_name).toBe('高等数学');
        expect(result.updates[0].update_type).toBe('fact');
        expect(result.updates[0].confidence).toBeGreaterThan(0.5);
    });

    it('should handle empty input gracefully', async () => {
        const result = await parseUserInput('');
        expect(result.updates).toHaveLength(0);
        expect(result.summary).toBeDefined();
    });

    it('should detect patterns from repeated feedback', async () => {
        const result = await parseUserInput(
            '连续三周高数老师都点名了，而且这周还抽了我'
        );

        expect(result.detected_patterns).toBeDefined();
        expect(result.detected_patterns!.length).toBeGreaterThan(0);
    });

    it('should output valid MemoryParseResult shape', async () => {
        const result = await parseUserInput('test input');

        expect(result).toHaveProperty('updates');
        expect(result).toHaveProperty('summary');
        expect(Array.isArray(result.updates)).toBe(true);

        for (const update of result.updates) {
            expect(update).toHaveProperty('course_name');
            expect(update).toHaveProperty('fields_to_update');
            expect(update).toHaveProperty('confidence');
            expect(update).toHaveProperty('requires_verification');
            expect(update).toHaveProperty('update_type');
        }
    });
});
