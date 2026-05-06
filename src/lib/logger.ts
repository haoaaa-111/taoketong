export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? 'info'] ?? LOG_LEVELS.info;

let currentTraceId: string | null = null;

export function setTraceId(id: string): void {
    currentTraceId = id;
}

export function getTraceId(): string | null {
    return currentTraceId;
}

function formatTs(): string {
    return new Date().toISOString();
}

export const logger = {
    log(level: LogLevel, module: string, message: string, data?: unknown) {
        if (LOG_LEVELS[level] < MAX_LEVEL) return;
        const ts = formatTs();
        const trace = currentTraceId ? ` [trace:${currentTraceId.slice(0, 8)}]` : '';
        const prefix = `[${ts}] [${level.toUpperCase().padEnd(5)}]${trace} [${module}]`;
        const dataStr = data !== undefined ? ' ' + JSON.stringify(data) : '';
        switch (level) {
            case 'error': console.error(`${prefix} ${message}${dataStr}`); break;
            case 'warn': console.warn(`${prefix} ${message}${dataStr}`); break;
            default: console.log(`${prefix} ${message}${dataStr}`);
        }
    },
    info(module: string, message: string, data?: unknown) { this.log('info', module, message, data); },
    warn(module: string, message: string, data?: unknown) { this.log('warn', module, message, data); },
    error(module: string, message: string, data?: unknown) { this.log('error', module, message, data); },
    debug(module: string, message: string, data?: unknown) { this.log('debug', module, message, data); },
};
