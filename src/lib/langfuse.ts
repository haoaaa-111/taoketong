import type OpenAI from 'openai';

let initialized = false;
let _langfuseSpanProcessor: { forceFlush(): Promise<void> } | null = null;

function isLangfuseEnabled(): boolean {
    return process.env.LANGFUSE_SHALLOW_LOGGING === 'true'
        && !!process.env.LANGFUSE_SECRET_KEY
        && !!process.env.LANGFUSE_PUBLIC_KEY
        && !!process.env.LANGFUSE_BASE_URL;
}

export function getLangfuseSpanProcessor(): { forceFlush(): Promise<void> } | null {
    return _langfuseSpanProcessor;
}

async function ensureOtelInit(): Promise<void> {
    if (initialized) return;
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node');
    const { LangfuseSpanProcessor } = await import('@langfuse/otel');

    const processor = new LangfuseSpanProcessor();
    _langfuseSpanProcessor = processor;
    const provider = new NodeTracerProvider({
        spanProcessors: [processor as any],
    });
    provider.register();
    initialized = true;
}

export async function wrapOpenAIClient(base: OpenAI): Promise<OpenAI> {
    if (!isLangfuseEnabled()) return base;

    try {
        await ensureOtelInit();
        const { observeOpenAI } = await import('@langfuse/openai');
        return observeOpenAI(base, {
            traceName: 'skipclass-llm',
        }) as unknown as OpenAI;
    } catch (e) {
        console.error('[Langfuse] Failed to wrap OpenAI client, tracing disabled:', (e as Error).message);
        return base;
    }
}
