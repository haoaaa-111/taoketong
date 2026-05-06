import { describe, it, expect } from '@jest/globals';
import { SessionGenerationError } from '@/agents/session-error';

describe('SessionGenerationError', () => {
    it('should set name to SessionGenerationError', () => {
        const err = new SessionGenerationError('msg', { code: 'E1', suggestion: 'try X' });
        expect(err.name).toBe('SessionGenerationError');
    });

    it('should preserve message', () => {
        const err = new SessionGenerationError('test message', { code: 'E2', suggestion: 'try Y' });
        expect(err.message).toBe('test message');
    });

    it('should preserve details', () => {
        const err = new SessionGenerationError('msg', { code: 'EMPTY_COURSES', suggestion: 'add courses' });
        expect(err.details.code).toBe('EMPTY_COURSES');
        expect(err.details.suggestion).toBe('add courses');
    });

    it('should be instanceof Error', () => {
        const err = new SessionGenerationError('msg', { code: 'X', suggestion: 'Y' });
        expect(err).toBeInstanceOf(Error);
    });
});
