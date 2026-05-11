-- UserConfig (仅一条记录)
CREATE TABLE IF NOT EXISTS user_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_start_date TEXT,
    semester_end_date TEXT,
    current_week INTEGER,
    current_day_of_week INTEGER CHECK (current_day_of_week BETWEEN 1 AND 7),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- UserProfile (仅一条记录)
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skip_motivation TEXT DEFAULT '[]',
    plan_start_date TEXT,
    plan_weeks INTEGER DEFAULT 1,
    weekly_skip_habit INTEGER DEFAULT 0,
    weekly_skip_target INTEGER DEFAULT 0,
    sub_cost_max INTEGER DEFAULT 30,
    escape_rush_accept INTEGER DEFAULT 0,
    commute_cost_minutes INTEGER DEFAULT 10,
    has_completed_onboarding INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Course
CREATE TABLE IF NOT EXISTS course (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    teacher_name TEXT,
    credits INTEGER,
    course_type TEXT DEFAULT '不确定',
    study_mode TEXT DEFAULT '自学',
    teacher_attitude TEXT DEFAULT '不确定',
    escape_difficulty TEXT,
    rollcall_methods TEXT DEFAULT '[]',
    catch_tolerance_per_class INTEGER DEFAULT 5,
    max_catch_limit INTEGER DEFAULT 3,
    current_caught_count INTEGER DEFAULT 0,
    rollcall_history TEXT DEFAULT '[]',
    exam_weeks TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- CourseSchedule
CREATE TABLE IF NOT EXISTS course_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    weeks TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    period_slot TEXT NOT NULL
);

-- PlanSession
CREATE TABLE IF NOT EXISTS plan_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_start_date TEXT NOT NULL,
    plan_end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'rejected')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- PlanAction
CREATE TABLE IF NOT EXISTS plan_action (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES plan_session(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES course_schedule(id) ON DELETE CASCADE,
    week INTEGER,
    action TEXT NOT NULL CHECK (action IN ('上课', '逃课', '签退')),
    reason TEXT
);

-- ImmediateFeedback
CREATE TABLE IF NOT EXISTS immediate_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES plan_session(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected')),
    adjustment_notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- WeeklyFeedback
CREATE TABLE IF NOT EXISTS weekly_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES plan_session(id) ON DELETE CASCADE,
    rating INTEGER,
    was_caught INTEGER DEFAULT 0,
    caught_courses TEXT,
    actual_events TEXT,
    memory_updates TEXT,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- CourseMemory
CREATE TABLE IF NOT EXISTS course_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    snapshot_data TEXT NOT NULL,
    last_updated TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_schedule_course ON course_schedule(course_id);
CREATE INDEX IF NOT EXISTS idx_action_session ON plan_action(session_id);
CREATE INDEX IF NOT EXISTS idx_action_schedule ON plan_action(schedule_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON immediate_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_weekly_feedback_session ON weekly_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_memory_course ON course_memory(course_id);