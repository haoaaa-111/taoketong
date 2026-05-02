import { initDatabase } from './index';

// 在应用启动时调用一次
let initialized = false;

export function ensureDatabaseReady(): void {
    if (initialized) return;
    initDatabase();
    initialized = true;
}