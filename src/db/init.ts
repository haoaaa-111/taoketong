import { initDatabase } from './index';
import { validateEnv } from '../lib/env-check';
import { logger } from '../lib/logger';

// Promise-based lock to prevent race conditions during initialization
let initPromise: Promise<void> | null = null;
let initialized = false;

/**
 * Synchronous init for module-level calls (backwards compatible).
 * Runs init immediately but also stores a promise for async waiting.
 */
export function ensureDatabaseReady(): void {
    if (initialized) return;
    
    initPromise = initializeDatabase();
}

/**
 * Async init for route handlers / middleware that need to wait for readiness.
 * Call this inside request handlers to properly await DB readiness.
 */
export async function ensureDatabaseReadyAsync(): Promise<void> {
    if (initialized) return;
    
    if (initPromise) {
        await initPromise;
        return;
    }
    
    initPromise = initializeDatabase();
    
    try {
        await initPromise;
    } catch (error) {
        initPromise = null;
        throw error;
    }
}

async function initializeDatabase(): Promise<void> {
    const envValidation = validateEnv();
    
    if (!envValidation.valid) {
        logger.warn('DB', 'Environment validation issues found');
        for (const error of envValidation.errors) {
            logger.warn('DB', error);
        }
        
        if (envValidation.errors.length > 0) {
            logger.info('DB', 'Proceeding with database initialization despite LLM configuration issues');
        }
    } else {
        logger.info('DB', 'Environment variables validated successfully');
    }
    
    for (const warning of envValidation.warnings) {
        logger.warn('DB', warning);
    }
    
    initDatabase();
    
    initialized = true;
}