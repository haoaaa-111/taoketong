// src/agents/memory-provider.ts

export interface MemoryProvider {
    /** Unique identifier for this provider */
    readonly name: string;

    /** Check if provider is available/configured */
    isAvailable(): boolean;

    /** Initialize provider for a session */
    initialize(sessionId: string, opts: InitOptions): Promise<void>;

    /** Return OpenAI-compatible tool schemas for this provider */
    getToolSchemas(): ToolSchema[];

    // ── Core lifecycle ──

    /** Static block added to the system prompt (e.g., tool usage instructions) */
    systemPromptBlock(): string;

    /** Pre-fetch relevant memory before plan generation */
    prefetch(query: string, sessionId?: string): Promise<string>;

    /** Sync per-turn user/assistant content into memory */
    syncTurn(userContent: string, assistantContent: string, sessionId?: string): Promise<void>;

    /** Clean up provider resources */
    shutdown(): Promise<void>;

    // ── Optional hooks ──

    /** Called when a session ends (plan generation complete) */
    onSessionEnd?(messages: Message[]): Promise<void>;

    /** Mirror hook: called whenever memory is written externally */
    onMemoryWrite?(
        action: string,
        target: string,
        content: string,
        metadata?: Record<string, unknown>
    ): Promise<void>;

    /** Extract critical info before context compression */
    onPreCompress?(messages: Message[]): Promise<string>;
}

export interface InitOptions {
    dbPath: string;
    userId: number;
    [key: string]: unknown;
}

export interface ToolSchema {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
