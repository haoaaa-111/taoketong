import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? 'info'] ?? LOG_LEVELS.info;

const logFile = process.env.LOG_FILE || 'data/app.log';
const LOG_TO_FILE = process.env.LOG_TO_FILE !== 'false';

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

function ensureLogDir(): void {
    const dir = path.dirname(logFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function writeToFile(line: string): void {
    if (!LOG_TO_FILE) return;
    try {
        ensureLogDir();
        fs.appendFileSync(logFile, line + '\n');
    } catch {
        // File write failure must not break the application
    }
}

export const logger = {
    log(level: LogLevel, module: string, message: string, data?: unknown) {
        if (LOG_LEVELS[level] < MAX_LEVEL) return;
        const ts = formatTs();
        const trace = currentTraceId ? ` [trace:${currentTraceId.slice(0, 8)}]` : '';
        const prefix = `[${ts}] [${level.toUpperCase().padEnd(5)}]${trace} [${module}]`;
        const dataStr = data !== undefined ? ' ' + JSON.stringify(data) : '';
        const line = `${prefix} ${message}${dataStr}`;
        switch (level) {
            case 'error': console.error(line); writeToFile(line); break;
            case 'warn': console.warn(line); writeToFile(line); break;
            default: process.stderr.write(line + '\n'); writeToFile(line);
        }
    },
    info(module: string, message: string, data?: unknown) { this.log('info', module, message, data); },
    warn(module: string, message: string, data?: unknown) { this.log('warn', module, message, data); },
    error(module: string, message: string, data?: unknown) { this.log('error', module, message, data); },
    debug(module: string, message: string, data?: unknown) { this.log('debug', module, message, data); },
};
