import { initDatabase } from './index';
import { validateEnv } from '../lib/env-check';

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
    // Validate environment variables before initializing database
    const envValidation = validateEnv();
    
    if (!envValidation.valid) {
        console.warn('Environment validation issues found:');
        for (const error of envValidation.errors) {
            console.warn(`  ERROR: ${error}`);
        }
        
        // Don't crash if only LLM_API_KEY is missing, warn and continue
        // Application can still serve static data without LLM
        if (envValidation.errors.length > 0) {
            console.log('Proceeding with database initialization despite LLM configuration issues...');
        }
    } else {
        console.log('Environment variables validated successfully');
    }
    
    // Log warnings if any
    for (const warning of envValidation.warnings) {
        console.warn(`  WARNING: ${warning}`);
    }
    
    // Initialize the database
    initDatabase();
    
    initialized = true;
}