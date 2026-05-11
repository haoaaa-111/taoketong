/**
 * 种子测试数据 — 6门课15课次 + 用户画像
 *
 * 用法:
 *   cd /home/zch/tkt_1/.worktrees/merge-preview
 *   npx tsx scripts/seed-test-data.ts
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = 'data/skipclass.db';

fs.mkdirSync('data', { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(process.cwd(), 'src', 'db', 'schema.sql'), 'utf-8');
db.exec(schema);

db.exec('DELETE FROM plan_action');
db.exec('DELETE FROM immediate_feedback');
db.exec('DELETE FROM weekly_feedback');
db.exec('DELETE FROM plan_session');
db.exec('DELETE FROM course_memory');
db.exec('DELETE FROM course_schedule');
db.exec('DELETE FROM course');
db.exec('DELETE FROM user_profile');
db.exec('DELETE FROM user_config');

db.prepare(`INSERT INTO user_config (id, semester_start_date, semester_end_date, current_week, current_day_of_week)
    VALUES (1, '2026-02-23', '2026-06-28', 11, 3)`).run();

db.prepare(`INSERT INTO user_profile (id, skip_motivation, plan_start_date, plan_weeks, weekly_skip_habit, weekly_skip_target, sub_cost_max, escape_rush_accept, commute_cost_minutes, has_completed_onboarding)
    VALUES (1, '["考研复习","单纯想逃"]', '2026-05-11', 4, 3, 6, 20, 1, 8, 0)`).run();

interface SeedCourse {
    name: string;
    location: string;
    teacher_name: string;
    credits: number;
    course_type: string;
    study_mode: string;
    teacher_attitude: string;
    escape_difficulty: string;
    rollcall_methods: string;
    catch_tolerance_per_class: number;
    max_catch_limit: number;
    exam_weeks: string;
    notes: string;
    schedules: { day_of_week: number; period_slot: string }[];
}

const courses: SeedCourse[] = [
    {
        name: '高等数学B', location: '教一楼 201', teacher_name: '王晓明', credits: 4,
        course_type: '专业课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离',
        rollcall_methods: JSON.stringify([{ method: '抽点', frequency: '偶尔' }]),
        catch_tolerance_per_class: 3, max_catch_limit: 2,
        exam_weeks: JSON.stringify({ mid: 10, final: 17 }),
        notes: '小班教学，抽点不定期但频率不低。数学底子差的必须听，有期中闭卷，期末占比60%',
        schedules: [{ day_of_week: 1, period_slot: '早一' }, { day_of_week: 3, period_slot: '早一' }, { day_of_week: 5, period_slot: '早二' }],
    },
    {
        name: '大学英语3', location: '外语楼 305', teacher_name: 'Lisa Chen', credits: 2,
        course_type: '专业课', study_mode: '自学', teacher_attitude: '理解', escape_difficulty: '方便撤离',
        rollcall_methods: JSON.stringify([{ method: '位置签到', frequency: '偶尔' }]),
        catch_tolerance_per_class: 5, max_catch_limit: 4,
        exam_weeks: JSON.stringify({ final: 17 }),
        notes: '外教上课，偶尔app签到但可以截图。最后排免挂，有小组作业，逃太多影响平时分',
        schedules: [{ day_of_week: 2, period_slot: '早一' }, { day_of_week: 4, period_slot: '早二' }],
    },
    {
        name: '马克思主义基本原理', location: '大礼堂', teacher_name: '张教授', credits: 3,
        course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离',
        rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]),
        catch_tolerance_per_class: 10, max_catch_limit: 10,
        exam_weeks: JSON.stringify({ final: 18 }),
        notes: '大礼堂300人一起上，老师读PPT，从不点名。考前背一背提纲就能过，逃课最优选',
        schedules: [{ day_of_week: 1, period_slot: '午一' }, { day_of_week: 3, period_slot: '午一' }],
    },
    {
        name: '数据结构与算法', location: '计算机楼 101', teacher_name: '李教授', credits: 4,
        course_type: '专业课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离',
        rollcall_methods: JSON.stringify([{ method: '全点名', frequency: '一直' }]),
        catch_tolerance_per_class: 2, max_catch_limit: 1,
        exam_weeks: JSON.stringify({ mid: 9, final: 17 }),
        notes: '核心专业课，李教授每节必点名，小班教学逃不掉。实验课必须在场，有上机考',
        schedules: [{ day_of_week: 2, period_slot: '午一' }, { day_of_week: 4, period_slot: '午一' }, { day_of_week: 2, period_slot: '午二' }],
    },
    {
        name: '大学物理A', location: '理学院 301', teacher_name: '赵教授', credits: 3,
        course_type: '水课', study_mode: '自学', teacher_attitude: '理解', escape_difficulty: '方便撤离',
        rollcall_methods: JSON.stringify([{ method: '签名表签到', frequency: '偶尔' }]),
        catch_tolerance_per_class: 6, max_catch_limit: 4,
        exam_weeks: JSON.stringify({ final: 18 }),
        notes: '赵教授性格好，偶尔传签名表但不核对。B站上有全套网课可以自学，期末开卷',
        schedules: [{ day_of_week: 3, period_slot: '早二' }, { day_of_week: 5, period_slot: '早一' }],
    },
    {
        name: '体育（篮球）', location: '体育馆', teacher_name: '刘教练', credits: 1,
        course_type: '特殊课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离',
        rollcall_methods: JSON.stringify([{ method: '全点名', frequency: '一直' }]),
        catch_tolerance_per_class: 1, max_catch_limit: 0,
        exam_weeks: JSON.stringify({}),
        notes: '体育课每节必到场，逃课直接扣分。不过一周就一节，影响不大',
        schedules: [{ day_of_week: 5, period_slot: '午二' }],
    },
];

const insertCourse = db.prepare(`INSERT INTO course
    (name, location, teacher_name, credits, course_type, study_mode, teacher_attitude, escape_difficulty, rollcall_methods, catch_tolerance_per_class, max_catch_limit, exam_weeks, notes)
    VALUES (@name, @location, @teacher_name, @credits, @course_type, @study_mode, @teacher_attitude, @escape_difficulty, @rollcall_methods, @catch_tolerance_per_class, @max_catch_limit, @exam_weeks, @notes)`);

const insertSchedule = db.prepare(`INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot)
    VALUES (@course_id, @weeks, @day_of_week, @period_slot)`);

const insertMemory = db.prepare(`INSERT INTO course_memory (course_id, snapshot_data)
    VALUES (@course_id, @snapshot_data)`);

const FULL_WEEKS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

for (const c of courses) {
    const result = insertCourse.run(c);
    const courseId = result.lastInsertRowid as number;

    const scheduleSnapshots: Array<{ schedule_id: number; weeks: number[]; day: number; period: string }> = [];
    for (const s of c.schedules) {
        const scheduleResult = insertSchedule.run({ course_id: courseId, weeks: JSON.stringify(FULL_WEEKS), day_of_week: s.day_of_week, period_slot: s.period_slot });
        const realScheduleId = scheduleResult.lastInsertRowid as number;
        scheduleSnapshots.push({ schedule_id: realScheduleId, weeks: FULL_WEEKS, day: s.day_of_week, period: s.period_slot });
    }

    const snapshot = {
        course_id: courseId,
        name: c.name,
        meta: { version: 1, updated_at: new Date().toISOString(), total_observations: 0, confidence_score: 0.3 },
        schedules: scheduleSnapshots,
        rollcall_model: {
            primary_method: c.rollcall_methods,
            frequency_model: { type: 'unknown', lambda: 0.3, confidence_interval: [0.1, 0.5] as [number, number] },
            pattern_detected: false,
            last_observed_week: 0,
        },
        caught_history: { total: 0, by_week: {}, trend: 'stable' as const, bayesian_posterior: { alpha: 1, beta: 1, expected_probability: 0.5 } },
        risk_signals: [],
        memory_budget: { used_chars: 0, limit_chars: 3000, utilization_pct: 0 },
    };

    insertMemory.run({ course_id: courseId, snapshot_data: JSON.stringify(snapshot) });
}

console.log('✅ 6门课 15课次已写入 data/skipclass.db');
console.log('');
console.log('测试 LLM 方案生成:');
console.log('  npx tsx scripts/generate-plan.ts');
db.close();
