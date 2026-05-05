type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, module: string, message: string): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${module}] [${level.toUpperCase()}]`;
    if (level === 'error') {
        console.error(prefix, message);
    } else if (level === 'warn') {
        console.warn(prefix, message);
    } else {
        console.log(prefix, message);
    }
}

export const logger = {
    info(module: string, message: string): void {
        log('info', module, message);
    },
    warn(module: string, message: string): void {
        log('warn', module, message);
    },
    error(module: string, message: string): void {
        log('error', module, message);
    },
};
