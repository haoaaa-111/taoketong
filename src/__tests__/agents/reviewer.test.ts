import { describe, it, expect, jest } from '@jest/globals';

// Mock LLM module
jest.mock('@/lib/llm', () => ({
    chatCompletionJSON: jest.fn(),
}));

// Mock the prompt file read
jest.mock('fs', () => ({
    readFileSync: jest.fn(() => 'mock review prompt'),
}));

import type { StructuredPlanContext } from '@/types';

const MOCK_CONTEXT: StructuredPlanContext = {
    user_profile: {
        risk_tolerance: '中等',
        weekly_skip_target: 3,
        study_mode: '上课学习',
        escape_rush_accept: true,
        constraints: [],
    },
    semester_info: {
        current_week: 5,
        day_of_week: 3,
        is_exam_week: false,
        is_first_week: false,
        total_weeks: 16,
    },
    courses: [
        {
            schedule_id: 1,
            course_id: 1,
            course_name: '高等数学',
            course_type: '专业课',
            study_mode: '上课学习',
            schedule_day: 1,
            schedule_period: '早一',
            schedule_weeks: [1, 2, 3, 4, 5, 6, 7, 8],
            risk_result: {
                risk_level: '高风险',
                risk_reason: '老师严抓',
                next_caught_probability: 0.7,
                confidence: 0.85,
            },
            rollcall_info: { method: '全点名', frequency: '经常' },
            is_first_class: false,
            constraints: [],
        },
    ],
    plan_weeks: 1,
};

describe('reviewContext', () => {
    it('should return ReviewResult with is_sufficient=true when LLM says info is sufficient', async () => {
        const { chatCompletionJSON } = await import('@/lib/llm');
        (chatCompletionJSON as jest.Mock).mockResolvedValue({
            is_sufficient: true,
            assessment: '信息充分',
            questions: [],
        });

        const { reviewContext } = await import('@/agents/reviewer');
        const result = await reviewContext(MOCK_CONTEXT);

        expect(result.is_sufficient).toBe(true);
        expect(result.questions).toHaveLength(0);
    });

    it('should return questions when LLM detects gaps', async () => {
        const { chatCompletionJSON } = await import('@/lib/llm');
        (chatCompletionJSON as jest.Mock).mockResolvedValue({
            is_sufficient: false,
            assessment: '发现信息缺口',
            questions: [
                {
                    id: 'q_test',
                    text: 'Test question?',
                    context: 'Some context',
                    type: 'choice',
                    options: ['A', 'B'],
                },
            ],
        });

        const { reviewContext } = await import('@/agents/reviewer');
        const result = await reviewContext(MOCK_CONTEXT);

        expect(result.is_sufficient).toBe(false);
        expect(result.questions).toHaveLength(1);
        expect(result.questions[0].id).toBe('q_test');
    });

    it('should return is_sufficient=true when LLM call fails (fail-safe)', async () => {
        const { chatCompletionJSON } = await import('@/lib/llm');
        (chatCompletionJSON as jest.Mock).mockRejectedValue(new Error('LLM unavailable'));

        const { reviewContext } = await import('@/agents/reviewer');
        const result = await reviewContext(MOCK_CONTEXT);

        expect(result.is_sufficient).toBe(true);
        expect(result.questions).toHaveLength(0);
    });

    it('should return is_sufficient=true when schema validation fails', async () => {
        const { chatCompletionJSON } = await import('@/lib/llm');
        (chatCompletionJSON as jest.Mock).mockRejectedValue(new Error('Zod validation error'));

        const { reviewContext } = await import('@/agents/reviewer');
        const result = await reviewContext(MOCK_CONTEXT);

        expect(result.is_sufficient).toBe(true);
    });

    it('should call LLM with correct circuitKey', async () => {
        const { chatCompletionJSON } = await import('@/lib/llm');
        (chatCompletionJSON as jest.Mock).mockResolvedValue({
            is_sufficient: true,
            assessment: 'ok',
            questions: [],
        });

        const { reviewContext } = await import('@/agents/reviewer');
        await reviewContext(MOCK_CONTEXT);

        expect(chatCompletionJSON).toHaveBeenCalledWith(
            expect.objectContaining({ circuitKey: 'reviewer' })
        );
    });
});
