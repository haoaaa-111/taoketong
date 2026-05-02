// === 枚举常量 ===
export const COURSE_TYPES = ['水课', '专业课', '特殊课', '不确定'] as const;
export const STUDY_MODES = ['上课学习', '自学'] as const;
export const TEACHER_ATTITUDES = ['严抓', '理解', '懒得管'] as const;
export const ESCAPE_DIFFICULTIES = ['方便撤离', '不便撤离'] as const;
export const RISK_LEVELS = ['无风险', '低风险', '中风险', '高风险', '未评估'] as const;
export const ACTION_TYPES = ['上课', '逃课', '签退'] as const;
export const SESSION_STATUSES = ['draft', 'accepted', 'rejected'] as const;
export const PERIOD_SLOTS = ['早一', '早二', '午一', '午二', '晚'] as const;
export const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
export const EVENT_TYPES = ['点名预警', '交作业', '调课', '补课', '其他'] as const;
export const ROLLCALL_FREQUENCIES = ['偶尔', '经常', '一直'] as const;

export const ROLLCALL_METHODS = [
    '抽点', '全点名', '位置签到', '可截图扫码', '需到场扫码', '签名表签到',
] as const;

// === 数据库类型 ===
export interface UserConfig {
    id: number;
    semester_start_date: string | null;
    semester_end_date: string | null;
    current_week: number | null;
    current_day_of_week: number | null;
    created_at: string;
    updated_at: string;
}

export interface UserProfile {
    id: number;
    skip_motivation: string[];
    plan_start_date: string | null;
    plan_weeks: number;
    weekly_skip_habit: number;
    weekly_skip_target: number;
    sub_cost_max: number;
    escape_rush_accept: boolean;
    commute_cost_minutes: number;
    has_completed_onboarding: boolean;
    created_at: string;
    updated_at: string;
}

export interface Course {
    id: number;
    name: string;
    location: string | null;
    teacher_name: string | null;
    credits: number | null;
    course_type: typeof COURSE_TYPES[number];
    study_mode: typeof STUDY_MODES[number];
    teacher_attitude: typeof TEACHER_ATTITUDES[number] | string;
    escape_difficulty: typeof ESCAPE_DIFFICULTIES[number] | null;
    rollcall_methods: RollcallMethodEntry[];
    catch_tolerance_per_class: number;
    max_catch_limit: number;
    current_caught_count: number;
    rollcall_history: string[];
    exam_weeks: ExamWeeks | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface RollcallMethodEntry {
    method: typeof ROLLCALL_METHODS[number] | string;
    frequency: typeof ROLLCALL_FREQUENCIES[number] | string;
}

export interface ExamWeeks {
    mid?: number;
    final?: number;
}

export interface CourseSchedule {
    id: number;
    course_id: number;
    weeks: number[];
    day_of_week: number;
    period_slot: typeof PERIOD_SLOTS[number];
}

export interface PlanSession {
    id: number;
    plan_start_date: string;
    plan_end_date: string;
    status: typeof SESSION_STATUSES[number];
    created_at: string;
}

export interface PlanAction {
    id: number;
    session_id: number;
    schedule_id: number;
    action: typeof ACTION_TYPES[number];
    reason: string | null;
}

export interface ImmediateFeedback {
    id: number;
    session_id: number;
    decision: 'accepted' | 'rejected';
    adjustment_notes: string | null;
    created_at: string;
}

export interface WeeklyFeedback {
    id: number;
    session_id: number;
    rating: number | null;
    was_caught: boolean;
    caught_courses: number[] | null;
    actual_events: PlanEvent[] | null;
    memory_updates: string | null;
    comment: string | null;
    created_at: string;
}

export interface PlanEvent {
    id?: number;
    course_id: number;
    event_type: typeof EVENT_TYPES[number];
    event_text: string;
    event_date: string;
}

export interface CourseMemory {
    id: number;
    course_id: number;
    snapshot_data: string;
    last_updated: string;
}

// === 输入/输出类型 ===
export interface ParsedCourse {
    name: string;
    location: string;
    teacher_name?: string;
    credits?: number;
    weeks: number[];
    day_of_week: number;
    period_slot: typeof PERIOD_SLOTS[number];
}

export interface CourseWithSchedules {
    course: Course;
    schedules: CourseSchedule[];
}

export interface SessionResult {
    success: boolean;
    session_id: number;
    actions: PlanAction[];
    message?: string;
}

export interface ModelerOutput {
    course_id: number;
    risk_level: typeof RISK_LEVELS[number];
    risk_reason: string;
    next_caught_probability: number;
}

// === Period Slot 工具 ===
export const PERIOD_TIME_DEFAULTS: Record<typeof PERIOD_SLOTS[number], { start: string; end: string }> = {
    '早一': { start: '08:00', end: '09:40' },
    '早二': { start: '10:00', end: '11:40' },
    '午一': { start: '14:00', end: '15:40' },
    '午二': { start: '16:00', end: '17:40' },
    '晚': { start: '19:00', end: '21:00' },
};
