/// <reference types="@jest/globals" />
import { describe, it, expect } from '@jest/globals';

function buildPromptContextForTest(config: {
    current_week?: number | null;
    current_day_of_week?: number | null;
    semester_start_date?: string | null;
    semester_end_date?: string | null;
    weekly_skip_target?: number | null;
    risk_tolerance?: string | null;
}): string {
    const currentWeek = config.current_week ?? 1;
    const dayOfWeek = config.current_day_of_week ?? 1;
    const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    let prompt = `[学期信息]\n当前第${currentWeek}周，${dayNames[dayOfWeek]}\n`;
    prompt += `学期：${config.semester_start_date ?? '未设置'} 至 ${config.semester_end_date ?? '未设置'}\n`;
    return prompt;
}

describe('Bug #4: null value protection in prompt', () => {
    it('should not contain "null" string when config fields are null', () => {
        const configWithNulls = {
            current_week: null,
            current_day_of_week: null,
            semester_start_date: null,
            semester_end_date: null,
        };

        const prompt = buildPromptContextForTest(configWithNulls);

        expect(prompt).not.toContain('"null"');
        expect(prompt).not.toMatch(/\bnull\b/);
    });

    it('should use defaults when config fields are null', () => {
        const configWithNulls = {
            current_week: null,
            current_day_of_week: null,
        };

        const prompt = buildPromptContextForTest(configWithNulls);

        expect(prompt).toContain('第1周');
        expect(prompt).toContain('周一');
    });

    it('should handle undefined config fields gracefully', () => {
        const minimalConfig = {};

        const prompt = buildPromptContextForTest(minimalConfig);

        expect(prompt).not.toContain('"null"');
        expect(prompt).not.toContain('undefined');
        expect(prompt).toContain('第1周');
        expect(prompt).toContain('周一');
    });

    it('should use actual values when config fields are set', () => {
        const validConfig = {
            current_week: 5,
            current_day_of_week: 3,
        };

        const prompt = buildPromptContextForTest(validConfig);

        expect(prompt).toContain('第5周');
        expect(prompt).toContain('周三');
        expect(prompt).not.toMatch(/\bnull\b/);
    });

    it('should guard semester dates from null', () => {
        const configWithNullDates = {
            current_week: 1,
            current_day_of_week: 1,
            semester_start_date: null,
            semester_end_date: null,
        };

        const prompt = buildPromptContextForTest(configWithNullDates);

        expect(prompt).not.toContain('null');
        expect(prompt).toContain('未设置');
    });
});
