/// <reference types="@jest/globals" />

const MOCK_MEMORY_MD = '你是一个课程记忆管理助手。';
const MOCK_LLM_RESPONSE = {
    updates: [{ course_name: 'test', fields_to_update: { teacher_attitude: '严抓' } }],
    summary: '已更新1门课程',
    detected_patterns: ['每周三点名'],
    suggested_actions: ['增加到课频率'],
};

jest.mock('@/lib/llm', () => ({
    __esModule: true,
    chatCompletionJSON: jest.fn(),
}));

jest.mock('fs', () => ({
    __esModule: true,
    readFileSync: jest.fn(() => MOCK_MEMORY_MD),
}));

import { chatCompletionJSON } from '@/lib/llm';
import { parseUserInput, MemoryOutputSchema } from '@/agents/memory';

describe('MemoryOutputSchema', () => {
    it('rejects output missing required summary field', () => {
        const result = MemoryOutputSchema.safeParse({
            updates: [],
        });
        expect(result.success).toBe(false);
    });

    it('accepts output with updates and summary fields', () => {
        const result = MemoryOutputSchema.safeParse({
            updates: [{ course_name: '高数', teacher_attitude: '严抓' }],
            summary: '已更新1门课程',
        });
        expect(result.success).toBe(true);
    });

    it('accepts output with all optional fields', () => {
        const result = MemoryOutputSchema.safeParse({
            updates: [{ course_name: '高数', fields_to_update: { teacher_attitude: '严抓' } }],
            summary: '已更新1门课程',
            detected_patterns: ['每周三点名'],
            suggested_actions: ['增加高数到课频率'],
        });
        expect(result.success).toBe(true);
    });
});

beforeEach(() => {
    jest.clearAllMocks();
    (chatCompletionJSON as jest.Mock).mockResolvedValue(MOCK_LLM_RESPONSE);
});

describe('parseUserInput', () => {
    it('returns updates and summary from chatCompletionJSON', async () => {
        const result = await parseUserInput('test input');
        expect(result).toEqual(MOCK_LLM_RESPONSE);
    });

    it('calls chatCompletionJSON with correct systemPrompt', async () => {
        await parseUserInput('test');
        expect(chatCompletionJSON).toHaveBeenCalledWith(expect.objectContaining({
            systemPrompt: expect.stringContaining(MOCK_MEMORY_MD),
        }));
    });

    it('systemPrompt includes SYSTEM_SAFETY_PREFIX', async () => {
        await parseUserInput('test');
        expect(chatCompletionJSON).toHaveBeenCalledWith(expect.objectContaining({
            systemPrompt: expect.stringContaining('重要安全指令'),
        }));
    });

    it('wraps user input with safety markers', async () => {
        await parseUserInput('test input');
        expect(chatCompletionJSON).toHaveBeenCalledWith(expect.objectContaining({
            userPrompt: expect.stringContaining('[用户输入开始]'),
        }));
    });

    it('user prompt contains original input text', async () => {
        await parseUserInput('specific input text');
        expect(chatCompletionJSON).toHaveBeenCalledWith(expect.objectContaining({
            userPrompt: expect.stringContaining('specific input text'),
        }));
    });

    it('passes systemPrompt and userPrompt as separate options', async () => {
        await parseUserInput('test');
        const calls = (chatCompletionJSON as jest.Mock).mock.calls[0][0];
        expect(calls).toHaveProperty('systemPrompt');
        expect(calls).toHaveProperty('userPrompt');
        expect(typeof calls.systemPrompt).toBe('string');
        expect(typeof calls.userPrompt).toBe('string');
    });

    it('propagates errors from chatCompletionJSON', async () => {
        (chatCompletionJSON as jest.Mock).mockRejectedValue(new Error('LLM error'));
        await expect(parseUserInput('test')).rejects.toThrow('LLM error');
    });

    it('throws on network error', async () => {
        (chatCompletionJSON as jest.Mock).mockRejectedValue(new Error('fetch failed'));
        await expect(parseUserInput('test')).rejects.toThrow('fetch failed');
    });

    it('handles empty user input', async () => {
        await parseUserInput('');
        expect(chatCompletionJSON).toHaveBeenCalled();
    });

    it('handles SQL injection-like input', async () => {
        await parseUserInput("\"}]); DROP TABLE users; --");
        expect(chatCompletionJSON).toHaveBeenCalledWith(expect.objectContaining({
            userPrompt: expect.stringContaining('DROP'),
        }));
    });

    it('user prompt ends with safety marker', async () => {
        await parseUserInput('test');
        expect(chatCompletionJSON).toHaveBeenCalledWith(expect.objectContaining({
            userPrompt: expect.stringContaining('[用户输入结束]'),
        }));
    });
});
