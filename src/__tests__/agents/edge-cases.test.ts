import { describe, it, expect } from '@jest/globals';
import { extractJSON } from '@/lib/llm';

describe('Bug #8: JSON extraction hardening', () => {
    it('should extract JSON from markdown code block', () => {
        const input = '```json\n{"key": "value"}\n```';
        expect(extractJSON(input)).toBe('{"key": "value"}');
    });

    it('should extract bare JSON object as fallback', () => {
        const input = 'some text {"key": "value"} more text';
        expect(extractJSON(input)).toBe('{"key": "value"}');
    });

    it('should extract bare JSON array as second fallback', () => {
        const input = 'results: [1, 2, 3] done';
        expect(extractJSON(input)).toBe('[1, 2, 3]');
    });

    it('should return trimmed raw text as last resort', () => {
        const input = '  no json here  ';
        expect(extractJSON(input)).toBe('no json here');
    });

    it('should handle nested JSON objects', () => {
        const input = '```json\n{"outer": {"inner": [1,2,3]}}\n```';
        const result = extractJSON(input);
        expect(result).toContain('"outer"');
        expect(result).toContain('"inner"');
    });
});
