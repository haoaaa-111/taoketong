/**
 * 不依赖 npm run dev，直接调 LLM 生成逃课方案
 *
 * 用法:
 *   npx tsx scripts/generate-plan.ts
 *
 * 前提: scripts/seed-test-data.ts 已经跑过（DB 里有课程数据）
 */

import path from 'path';
import { existsSync } from 'fs';

const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
}

import { generateSession } from '@/agents/orchestrator';
import { ensureDatabaseReady } from '@/db/init';

async function main() {
    ensureDatabaseReady();

    console.log('🤖 正在调用 LLM 生成方案...\n');
    const start = Date.now();

    try {
        const result = await generateSession({});
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        console.log(`✅ 方案生成完成 (${elapsed}s)\n`);
        console.log(`session_id: ${result.session_id}`);
        console.log(`actions: ${result.actions.length} 条\n`);

        const label: Record<string, string> = { '上课': '📖 上课', '逃课': '🏃 逃课', '签退': '🚪 签退' };
        for (const action of result.actions) {
            console.log(`  ${label[action.action] || action.action}  schedule_id=${action.schedule_id}  ${action.reason ? `— ${action.reason}` : ''}`);
        }
    } catch (e) {
        console.error('❌ 方案生成失败:', (e as Error).message);
        process.exit(1);
    }
}

main();
