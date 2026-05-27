import { NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/data/fs-store';
import { handleError } from '@/lib/errors';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function deleteFilesInDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }
}

export async function POST() {
  try {
    const plansDir = path.join(DATA_DIR, 'plans');
    if (fs.existsSync(plansDir)) {
      deleteFilesInDir(plansDir);
    }

    const feedbackDir = path.join(DATA_DIR, 'feedback');
    if (fs.existsSync(feedbackDir)) {
      deleteFilesInDir(feedbackDir);
    }

    const refinedDir = path.join(DATA_DIR, 'refined');
    if (fs.existsSync(refinedDir)) {
      deleteFilesInDir(refinedDir);
    }

    const testLogsDir = path.join(DATA_DIR, 'test-logs');
    if (fs.existsSync(testLogsDir)) {
      fs.rmSync(testLogsDir, { recursive: true, force: true });
      fs.mkdirSync(testLogsDir, { recursive: true });
    }

    const config = readConfig();
    if (config) {
      writeConfig({ ...config, current_week: 1 });
    }

    const rollcallPath = path.join(DATA_DIR, 'rollcall-history.md');
    if (fs.existsSync(rollcallPath)) {
      const header = `# 点名历史记录

| date | week | scheduleId | courseName | plannedAction | actualAction | wasCaught | rollcallMethod | attendanceRate |
|------|------|------------|------------|---------------|--------------|-----------|----------------|----------------|
`;
      fs.writeFileSync(rollcallPath, header, 'utf-8');
    }

    const sessionLogPath = path.join(plansDir, 'session-log.md');
    if (fs.existsSync(sessionLogPath)) {
      fs.writeFileSync(sessionLogPath, '# Session Log\n\n', 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: '已清除所有数据并重置到第 1 周',
      cleared: {
        plans: true,
        feedback: true,
        refined: true,
        testLogs: true,
        rollcallHistory: true,
        currentWeek: 1,
      },
    });
  } catch (e) {
    const errorResult = handleError(e);
    return NextResponse.json({ error: errorResult.message }, { status: errorResult.status });
  }
}
