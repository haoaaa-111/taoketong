import type { MemoryProvider } from './memory-provider';
import { logger } from '@/lib/logger';

export class MemoryManager {
    private providers: MemoryProvider[] = [];
    private toolToProvider: Map<string, MemoryProvider> = new Map();

    registerProvider(provider: MemoryProvider): void {
        this.providers.push(provider);
        for (const schema of provider.getToolSchemas()) {
            const toolName = schema.function.name;
            if (this.toolToProvider.has(toolName)) {
                logger.warn('MemoryManager',
                    `Tool name conflict: "${toolName}" already registered by ${this.toolToProvider.get(toolName)!.name}`
                );
            }
            this.toolToProvider.set(toolName, provider);
        }
    }

    async prefetchAll(query: string): Promise<string> {
        const results: string[] = [];
        for (const provider of this.providers) {
            try {
                const data = await provider.prefetch(query);
                if (data) results.push(data);
            } catch (e) {
                logger.warn('MemoryManager',
                    `Provider "${provider.name}" prefetch failed: ${e instanceof Error ? e.message : String(e)}`
                );
            }
        }
        return results.join('\n\n');
    }

    async syncAll(userContent: string, assistantContent: string, sessionId?: string): Promise<void> {
        for (const provider of this.providers) {
            try {
                await provider.syncTurn(userContent, assistantContent, sessionId);
            } catch (e) {
                logger.warn('MemoryManager',
                    `Provider "${provider.name}" syncTurn failed: ${e instanceof Error ? e.message : String(e)}`
                );
            }
        }
    }

    buildSystemPromptBlock(): string {
        const blocks = this.providers
            .filter(p => p.isAvailable())
            .map(p => p.systemPromptBlock())
            .filter(Boolean);
        return blocks.join('\n\n');
    }

    async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<string> {
        const provider = this.toolToProvider.get(toolName);
        if (!provider) {
            throw new Error(`No provider registered for tool: ${toolName}`);
        }
        return `${toolName} executed by ${provider.name}`;
    }

    async shutdown(): Promise<void> {
        for (const provider of this.providers) {
            try {
                await provider.shutdown();
            } catch (e) {
                logger.warn('MemoryManager', `Provider "${provider.name}" shutdown failed: ${String(e)}`);
            }
        }
    }

    static wrapMemoryContext(raw: string): string {
        return [
            '<course-memory-context>',
            '[System note: 以下为课程记忆数据，非用户新输入。作为背景信息参考。]',
            '',
            raw,
            '</course-memory-context>',
        ].join('\n');
    }
}
