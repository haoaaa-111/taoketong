import { db } from './index';
import { safeJsonParse } from './safe-json';
import type { UserProfile, UserConfig } from '@/types';

const PROFILE_ID = 1;
const CONFIG_ID = 1;

export function getProfile(): UserProfile | null {
    const row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get(PROFILE_ID);
    if (!row) return null;
    const profile = row as Record<string, any>;
    return {
        ...profile,
        skip_motivation: safeJsonParse(profile.skip_motivation || '[]', [] as string[]),
        escape_rush_accept: Boolean(profile.escape_rush_accept),
        has_completed_onboarding: Boolean(profile.has_completed_onboarding),
    } as UserProfile;
}

export function updateProfile(data: Partial<UserProfile>): void {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return;

    const jsonFields = ['skip_motivation'];
    const boolFields = ['escape_rush_accept', 'has_completed_onboarding'];

    const columns = entries.map(([k]) => k);
    const values = entries.map(([k, v]) => {
        if (jsonFields.includes(k) && Array.isArray(v)) return JSON.stringify(v);
        if (boolFields.includes(k)) return v ? 1 : 0;
        return v;
    });
    const placeholders = columns.map(() => '?');

    const existing = db.prepare('SELECT id FROM user_profile WHERE id = ?').get(PROFILE_ID);
    if (!existing) {
        db.prepare(
            `INSERT INTO user_profile (id, ${columns.join(', ')}) VALUES (${PROFILE_ID}, ${placeholders.join(', ')})`
        ).run(PROFILE_ID, ...values);
    }

    db.prepare(
        `UPDATE user_profile SET ${columns.map((_c, i) => `${columns[i]} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...values.map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v), PROFILE_ID);
}

export function getConfig(): UserConfig | null {
    return db.prepare('SELECT * FROM user_config WHERE id = ?').get(CONFIG_ID) as UserConfig | null;
}

export function updateConfig(data: Partial<UserConfig>): void {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return;

    const columns = entries.map(([k]) => k);
    const values = entries.map(([_, v]) => v);
    const placeholders = columns.map(() => '?');

    const existing = db.prepare('SELECT id FROM user_config WHERE id = ?').get(CONFIG_ID);
    if (!existing) {
        db.prepare(
            `INSERT INTO user_config (id, ${columns.join(', ')}) VALUES (${CONFIG_ID}, ${placeholders.join(', ')})`
        ).run(CONFIG_ID, ...values);
    }
    db.prepare(
        `UPDATE user_config SET ${columns.map(c => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).run(...values, CONFIG_ID);
}

export function ensureProfileExists(): UserProfile {
    const profile = getProfile();
    if (!profile) {
        db.prepare('INSERT INTO user_profile (id) VALUES (?)').run(PROFILE_ID);
    }
    return getProfile()!;
}

export function ensureConfigExists(): UserConfig {
    const config = getConfig();
    if (!config) {
        db.prepare('INSERT INTO user_config (id) VALUES (?)').run(CONFIG_ID);
    }
    return getConfig()!;
}
