import type { MemoryProvider, InitOptions, ToolSchema } from '../memory-provider';
import { getAllCourseSnapshots } from '@/db/memory';

export class CourseMemoryProvider implements MemoryProvider {
    readonly name = 'builtin-course-memory';
    private initialized = false;

    isAvailable(): boolean {
        return true;
    }

    async initialize(_sessionId: string, _opts: InitOptions): Promise<void> {
        this.initialized = true;
    }

    getToolSchemas(): ToolSchema[] {
        return [];
    }

    systemPromptBlock(): string {
        return `## 课程记忆数据
<course-memory>标签中的数据来自你对各门课程的历史观察和用户反馈。
这些数据是背景信息，用于辅助排课决策。请参考但不要逐字复述。
如果数据与用户当前描述冲突，以用户当前描述为准。`;
    }

    async prefetch(_query: string, _sessionId?: string): Promise<string> {
        const snapshots = getAllCourseSnapshots();
        const data = snapshots.map(s => ({
            course_id: s.course_id,
            name: s.course_name,
            snapshot: typeof s.snapshot_data === 'string'
                ? JSON.parse(s.snapshot_data)
                : s.snapshot_data,
        }));
        return JSON.stringify(data);
    }

    async syncTurn(
        _userContent: string,
        _assistantContent: string,
        _sessionId?: string
    ): Promise<void> {
        // In Chunk 1.5, this will parse user feedback and update snapshots.
    }

    async shutdown(): Promise<void> {
        this.initialized = false;
    }
}
