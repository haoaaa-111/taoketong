interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60_000;

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

const defaultConfigs: Record<string, RateLimitConfig> = {
    '/api/session': { maxRequests: 5, windowMs: 60_000 },
    '/api/feedback': { maxRequests: 10, windowMs: 60_000 },
    '/api/parse-image': { maxRequests: 3, windowMs: 60_000 },
};

export function getConfig(path: string): RateLimitConfig {
    for (const [prefix, config] of Object.entries(defaultConfigs)) {
        if (path.startsWith(prefix)) return config;
    }
    return { maxRequests: Infinity, windowMs: 0 };
}

export function checkRateLimit(ip: string, path: string): { allowed: boolean; retryAfter?: number } {
    const config = getConfig(path);
    if (config.maxRequests === Infinity) return { allowed: true };

    const key = `${ip}:${path}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + config.windowMs });
        return { allowed: true };
    }

    if (entry.count >= config.maxRequests) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }

    entry.count++;
    return { allowed: true };
}

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now >= entry.resetAt) store.delete(key);
    }
}, CLEANUP_INTERVAL);

export function getRateLimitHeader(ip: string, path: string): { limit: number; remaining: number; reset: number } {
    const config = getConfig(path);
    const key = `${ip}:${path}`;
    const entry = store.get(key);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
        return { limit: config.maxRequests, remaining: config.maxRequests, reset: 0 };
    }

    return {
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - entry.count),
        reset: Math.ceil((entry.resetAt - now) / 1000),
    };
}
