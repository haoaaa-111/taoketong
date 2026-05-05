import { describe, it, expect } from '@jest/globals';
import type { MemoryProvider, InitOptions, ToolSchema } from '@/agents/memory-provider';

describe('MemoryProvider interface contract', () => {
    it('should make the module resolvable at runtime', () => {
        // This MUST fail until src/agents/memory-provider.ts is created
        expect(() => jest.requireActual('@/agents/memory-provider')).not.toThrow();
    });

    it('should accept a valid implementation satisfying the interface', () => {
        const mockProvider: MemoryProvider = {
            name: 'test-provider',
            isAvailable: () => true,
            initialize: async (_sessionId: string, _opts: InitOptions) => {},
            getToolSchemas: () => [],
            systemPromptBlock: () => 'Test system prompt block',
            prefetch: async (_query: string, _sessionId?: string) => 'test prefetch data',
            syncTurn: async (_user: string, _asst: string, _sid?: string) => {},
            shutdown: async () => {},
            onSessionEnd: async (_messages) => {},
            onMemoryWrite: async (_action, _target, _content, _meta) => {},
            onPreCompress: async (_messages) => 'compressed',
        };

        expect(mockProvider.name).toBe('test-provider');
        expect(mockProvider.isAvailable()).toBe(true);
        expect(mockProvider.systemPromptBlock()).toBe('Test system prompt block');
    });

    it('ToolSchema type should be structurally correct', () => {
        const schema: ToolSchema = {
            type: 'function',
            function: {
                name: 'update_course_memory',
                description: 'Update course memory with new information',
                parameters: {
                    type: 'object',
                    properties: {
                        course_name: { type: 'string' },
                        field: { type: 'string' },
                        value: { type: 'string' },
                    },
                    required: ['course_name', 'field', 'value'],
                },
            },
        };

        expect(schema.type).toBe('function');
        expect(schema.function.name).toBe('update_course_memory');
        expect(schema.function.parameters.required).toContain('course_name');
    });
});
