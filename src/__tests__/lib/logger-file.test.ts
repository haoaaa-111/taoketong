import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const testLogPath = path.join(process.cwd(), 'data', 'test-app.log');

describe('logger file transport', () => {
    beforeEach(() => {
        jest.resetModules();
        delete process.env.LOG_FILE;
        delete process.env.LOG_TO_FILE;
        try { fs.unlinkSync(testLogPath); } catch {}
    });

    afterEach(() => {
        try { fs.unlinkSync(testLogPath); } catch {}
    });

    it('does not write to file when LOG_TO_FILE=false', async () => {
        process.env.LOG_TO_FILE = 'false';
        process.env.LOG_FILE = testLogPath;

        const { logger } = await import('@/lib/logger');
        logger.info('test', 'should not write');

        expect(fs.existsSync(testLogPath)).toBe(false);
    });

    it('writes to file when LOG_TO_FILE is not "false"', async () => {
        process.env.LOG_TO_FILE = 'true';
        process.env.LOG_FILE = testLogPath;

        const { logger } = await import('@/lib/logger');
        logger.info('test', 'should write to file');

        expect(fs.existsSync(testLogPath)).toBe(true);
        const content = fs.readFileSync(testLogPath, 'utf-8');
        expect(content).toContain('should write to file');
    });

    it('creates parent directories if they do not exist', async () => {
        const deepPath = path.join(process.cwd(), 'data', 'test-logs', 'deep', 'app.log');

        process.env.LOG_TO_FILE = 'true';
        process.env.LOG_FILE = deepPath;

        try { fs.rmdirSync(path.dirname(deepPath), { recursive: true }); } catch {}

        const { logger } = await import('@/lib/logger');
        logger.info('test', 'deep directory test');

        expect(fs.existsSync(deepPath)).toBe(true);

        try { fs.rmdirSync(path.dirname(deepPath), { recursive: true }); } catch {}
    });
});
