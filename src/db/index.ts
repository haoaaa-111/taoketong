import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'skipclass.db');

// 确保数据目录存在
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
    const schema = fs.readFileSync(
        path.join(process.cwd(), 'src', 'db', 'schema.sql'),
        'utf-8'
    );
    db.exec(schema);
}

export function closeDB(): void {
    db.close();
}

export async function pingDB(): Promise<boolean> {
    try {
        db.prepare('SELECT 1').get();
        return true;
    } catch (error) {
        console.error('Database ping failed:', error);
        return false;
    }
}

export { db };