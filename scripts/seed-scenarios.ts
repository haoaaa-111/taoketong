/**
 * 三种用户场景种子数据
 *
 * 用法:
 *   cd /home/zch/tkt_1/.worktrees/merge-preview
 *   npx tsx scripts/seed-scenarios.ts 考研党
 *   npx tsx scripts/seed-scenarios.ts 保研党
 *   npx tsx scripts/seed-scenarios.ts 实习党
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const scenario = process.argv[2];
if (!['考研党', '保研党', '实习党'].includes(scenario)) {
    console.error('用法: npx tsx scripts/seed-scenarios.ts <考研党|保研党|实习党>');
    process.exit(1);
}

const DB_PATH = 'data/skipclass.db';
fs.mkdirSync('data', { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(process.cwd(), 'src', 'db', 'schema.sql'), 'utf-8'));

db.exec('DELETE FROM plan_action');
db.exec('DELETE FROM immediate_feedback');
db.exec('DELETE FROM weekly_feedback');
db.exec('DELETE FROM plan_session');
db.exec('DELETE FROM course_memory');
db.exec('DELETE FROM course_schedule');
db.exec('DELETE FROM course');
db.exec('DELETE FROM user_profile');
db.exec('DELETE FROM user_config');

interface SeedCourse {
    name: string; location: string; teacher_name: string; credits: number;
    course_type: string; study_mode: string; teacher_attitude: string; escape_difficulty: string;
    rollcall_methods: string; catch_tolerance_per_class: number; max_catch_limit: number;
    exam_weeks: string; notes: string;
    schedules: { day_of_week: number; period_slot: string }[];
}

interface ScenarioConfig {
    profile: {
        skip_motivation: string; plan_weeks: number; weekly_skip_habit: number;
        weekly_skip_target: number; sub_cost_max: number; escape_rush_accept: number;
        commute_cost_minutes: number;
    };
    config: { semester_start: string; semester_end: string; current_week: number; current_day: number };
    courses: SeedCourse[];
    description: string;
}

const FULL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

const scenarios: Record<string, ScenarioConfig> = {

    '考研党': {
        profile: {
            skip_motivation: '["考研复习","课太水","单纯想逃"]',
            plan_weeks: 4, weekly_skip_habit: 5, weekly_skip_target: 10,
            sub_cost_max: 15, escape_rush_accept: 1, commute_cost_minutes: 5,
        },
        config: { semester_start: '2026-02-23', semester_end: '2026-06-28', current_week: 11, current_day: 1 },
        description: '大四考研，目标是每周逃 10 节去图书馆。预算低（15/节），倾向全逃不签退。8 门课 19 课次，5 水课。',
        courses: [
            { name: '马克思主义基本原理', location: '大礼堂', teacher_name: '赵教授', credits: 3, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({ final: 18 }), notes: '300人大课，从不点名，考前背提纲',
              schedules: [{ day_of_week: 1, period_slot: '午一' }, { day_of_week: 3, period_slot: '午一' }] },
            { name: '大学物理A', location: '理学院 301', teacher_name: '钱教授', credits: 3, course_type: '水课', study_mode: '自学', teacher_attitude: '理解', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '签名表签到', frequency: '偶尔' }]), catch_tolerance_per_class: 8, max_catch_limit: 6, exam_weeks: JSON.stringify({ final: 18 }), notes: '偶尔传签名表不核对，B站有网课',
              schedules: [{ day_of_week: 2, period_slot: '早二' }, { day_of_week: 4, period_slot: '早一' }] },
            { name: '大学生心理健康', location: '教三楼 105', teacher_name: '孙老师', credits: 2, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({}), notes: '全学期不点名，写篇论文交就行',
              schedules: [{ day_of_week: 5, period_slot: '午二' }] },
            { name: '中国近现代史纲要', location: 'B102', teacher_name: '曹教授', credits: 2, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({ final: 18 }), notes: '大教室读PPT，偶尔放纪录片，从不点名',
              schedules: [{ day_of_week: 5, period_slot: '早二' }] },
            { name: '创业基础', location: '教四楼 102', teacher_name: '林老师', credits: 1, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({}), notes: '创新创业学院开的，交商业计划书就过',
              schedules: [{ day_of_week: 2, period_slot: '午二' }] },
            { name: '高等数学B', location: '教一楼 201', teacher_name: '王教授', credits: 4, course_type: '专业课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离', rollcall_methods: JSON.stringify([{ method: '抽点', frequency: '偶尔' }]), catch_tolerance_per_class: 3, max_catch_limit: 2, exam_weeks: JSON.stringify({ mid: 10, final: 17 }), notes: '小班抽点，数学底子差的得听，期中期末占70%',
              schedules: [{ day_of_week: 1, period_slot: '早一' }, { day_of_week: 3, period_slot: '早一' }, { day_of_week: 5, period_slot: '早一' }] },
            { name: '大学英语3', location: '外语楼 201', teacher_name: 'Lisa Chen', credits: 2, course_type: '专业课', study_mode: '自学', teacher_attitude: '理解', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '位置签到', frequency: '偶尔' }]), catch_tolerance_per_class: 5, max_catch_limit: 4, exam_weeks: JSON.stringify({ final: 17 }), notes: '外教，偶尔app签到可截图，小组作业影响平时分',
              schedules: [{ day_of_week: 2, period_slot: '早一' }, { day_of_week: 4, period_slot: '早二' }, { day_of_week: 1, period_slot: '午二' }] },
            { name: '体育（羽毛球）', location: '体育馆', teacher_name: '周教练', credits: 1, course_type: '特殊课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离', rollcall_methods: JSON.stringify([{ method: '全点名', frequency: '一直' }]), catch_tolerance_per_class: 1, max_catch_limit: 0, exam_weeks: JSON.stringify({}), notes: '必须到场，逃直接扣分',
              schedules: [{ day_of_week: 3, period_slot: '午二' }] },
        ],
    },

    '保研党': {
        profile: {
            skip_motivation: '["实验/科研冲突","课太水"]',
            plan_weeks: 3, weekly_skip_habit: 1, weekly_skip_target: 2,
            sub_cost_max: 50, escape_rush_accept: 0, commute_cost_minutes: 12,
        },
        config: { semester_start: '2026-02-23', semester_end: '2026-06-28', current_week: 10, current_day: 2 },
        description: '大三保研边缘，GPA 敏感。只逃确定安全的水课，专业课必到。7 门课 16 课次，4 专业课。',
        courses: [
            { name: '数据结构与算法', location: '计算机楼 101', teacher_name: '李教授', credits: 4, course_type: '专业课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离', rollcall_methods: JSON.stringify([{ method: '全点名', frequency: '一直' }]), catch_tolerance_per_class: 2, max_catch_limit: 1, exam_weeks: JSON.stringify({ mid: 9, final: 17 }), notes: '核心课，必点名必到，有上机考',
              schedules: [{ day_of_week: 2, period_slot: '午一' }, { day_of_week: 4, period_slot: '午一' }, { day_of_week: 2, period_slot: '午二' }] },
            { name: '操作系统', location: '计算机楼 203', teacher_name: '陈教授', credits: 4, course_type: '专业课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离', rollcall_methods: JSON.stringify([{ method: '抽点', frequency: '偶尔' }]), catch_tolerance_per_class: 3, max_catch_limit: 2, exam_weeks: JSON.stringify({ mid: 10, final: 17 }), notes: '保研关键课，抽点但频率不高，宁可到不可逃',
              schedules: [{ day_of_week: 1, period_slot: '早一' }, { day_of_week: 3, period_slot: '早一' }] },
            { name: '计算机网络', location: '计算机楼 305', teacher_name: '刘教授', credits: 3, course_type: '专业课', study_mode: '自学', teacher_attitude: '理解', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '位置签到', frequency: '偶尔' }]), catch_tolerance_per_class: 5, max_catch_limit: 3, exam_weeks: JSON.stringify({ final: 18 }), notes: '保研方向课，签到不严格但缺课影响印象分',
              schedules: [{ day_of_week: 3, period_slot: '早二' }, { day_of_week: 5, period_slot: '早二' }] },
            { name: '线性代数', location: '教一楼 303', teacher_name: '韩教授', credits: 3, course_type: '专业课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离', rollcall_methods: JSON.stringify([{ method: '抽点', frequency: '偶尔' }]), catch_tolerance_per_class: 3, max_catch_limit: 2, exam_weeks: JSON.stringify({ mid: 9, final: 17 }), notes: '保研绩点课，抽点但是要认真听，期中占比30%',
              schedules: [{ day_of_week: 2, period_slot: '早一' }, { day_of_week: 4, period_slot: '早一' }] },
            { name: '毛泽东思想和中国特色社会主义理论体系概论', location: 'A101', teacher_name: '张教授', credits: 3, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({ final: 18 }), notes: '大课不点名，唯一确定可以逃的课',
              schedules: [{ day_of_week: 1, period_slot: '午一' }, { day_of_week: 5, period_slot: '午一' }] },
            { name: '大学生心理健康', location: '教三楼 105', teacher_name: '孙老师', credits: 2, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({}), notes: '不点名，写论文交差',
              schedules: [{ day_of_week: 5, period_slot: '午二' }] },
            { name: '大学物理实验', location: '理学院 201', teacher_name: '吴教授', credits: 1, course_type: '特殊课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离', rollcall_methods: JSON.stringify([{ method: '全点名', frequency: '一直' }]), catch_tolerance_per_class: 1, max_catch_limit: 0, exam_weeks: JSON.stringify({}), notes: '实验课必须到场，缺一次直接挂',
              schedules: [{ day_of_week: 4, period_slot: '午二' }] },
        ],
    },

    '实习党': {
        profile: {
            skip_motivation: '["实习上班","课太水"]',
            plan_weeks: 4, weekly_skip_habit: 4, weekly_skip_target: 8,
            sub_cost_max: 30, escape_rush_accept: 1, commute_cost_minutes: 40,
        },
        config: { semester_start: '2026-02-23', semester_end: '2026-06-28', current_week: 12, current_day: 4 },
        description: '大三实习期，一周三天在公司。须大量逃课但部分课要保。签退模式开启（偶尔溜回学校）。7 门课 17 课次，3 水 3 专业 1 特殊。',
        courses: [
            { name: '软件工程', location: '计算机楼 401', teacher_name: '黄教授', credits: 3, course_type: '专业课', study_mode: '自学', teacher_attitude: '理解', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '位置签到', frequency: '偶尔' }]), catch_tolerance_per_class: 5, max_catch_limit: 4, exam_weeks: JSON.stringify({ final: 18 }), notes: '老师知道大四在实习，比较通融。偶尔签到但不管真假',
              schedules: [{ day_of_week: 1, period_slot: '早一' }, { day_of_week: 3, period_slot: '早一' }] },
            { name: '数据库原理', location: '计算机楼 302', teacher_name: '杨教授', credits: 3, course_type: '专业课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离', rollcall_methods: JSON.stringify([{ method: '全点名', frequency: '一直' }]), catch_tolerance_per_class: 2, max_catch_limit: 1, exam_weeks: JSON.stringify({ final: 17 }), notes: '严师全点，可用代课。期末闭卷，考前要突击',
              schedules: [{ day_of_week: 2, period_slot: '早二' }, { day_of_week: 4, period_slot: '早一' }] },
            { name: '编译原理', location: '计算机楼 501', teacher_name: '徐教授', credits: 3, course_type: '专业课', study_mode: '自学', teacher_attitude: '理解', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '抽点', frequency: '偶尔' }]), catch_tolerance_per_class: 5, max_catch_limit: 3, exam_weeks: JSON.stringify({ final: 18 }), notes: '大四选修课，老师不太管，偶尔抽点。有实验报告但可请代写',
              schedules: [{ day_of_week: 1, period_slot: '早二' }, { day_of_week: 5, period_slot: '早一' }] },
            { name: '就业指导', location: '教二楼 103', teacher_name: '马老师', credits: 1, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({}), notes: '就业办开的课，不点名，交份简历就算过',
              schedules: [{ day_of_week: 3, period_slot: '午二' }] },
            { name: '形势与政策', location: '报告厅', teacher_name: '辅导员', credits: 1, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({}), notes: '报告厅200人，辅导员自己也不想管，不点名',
              schedules: [{ day_of_week: 5, period_slot: '午一' }] },
            { name: '创新创业导论', location: '教四楼 102', teacher_name: '林老师', credits: 1, course_type: '水课', study_mode: '自学', teacher_attitude: '懒得管', escape_difficulty: '方便撤离', rollcall_methods: JSON.stringify([{ method: '从不点名', frequency: '几乎不点' }]), catch_tolerance_per_class: 10, max_catch_limit: 10, exam_weeks: JSON.stringify({}), notes: '选修水课，交商业计划书，从不点名',
              schedules: [{ day_of_week: 4, period_slot: '午二' }] },
            { name: '体育（游泳）', location: '游泳馆', teacher_name: '郑教练', credits: 1, course_type: '特殊课', study_mode: '自学', teacher_attitude: '严抓', escape_difficulty: '不便撤离', rollcall_methods: JSON.stringify([{ method: '全点名', frequency: '一直' }]), catch_tolerance_per_class: 1, max_catch_limit: 0, exam_weeks: JSON.stringify({}), notes: '游泳课必须到场，缺课直接不及格',
              schedules: [{ day_of_week: 2, period_slot: '午二' }] },
        ],
    },
};

const cfg = scenarios[scenario];

db.prepare(`INSERT INTO user_config (id, semester_start_date, semester_end_date, current_week, current_day_of_week)
    VALUES (1, @start, @end, @week, @day)`).run({ start: cfg.config.semester_start, end: cfg.config.semester_end, week: cfg.config.current_week, day: cfg.config.current_day });

db.prepare(`INSERT INTO user_profile (id, skip_motivation, plan_start_date, plan_weeks, weekly_skip_habit, weekly_skip_target, sub_cost_max, escape_rush_accept, commute_cost_minutes, has_completed_onboarding)
    VALUES (1, @motivation, '2026-05-11', @plan_weeks, @habit, @target, @cost, @escape, @commute, 0)`).run({
    motivation: cfg.profile.skip_motivation, plan_weeks: cfg.profile.plan_weeks,
    habit: cfg.profile.weekly_skip_habit, target: cfg.profile.weekly_skip_target,
    cost: cfg.profile.sub_cost_max, escape: cfg.profile.escape_rush_accept, commute: cfg.profile.commute_cost_minutes,
});

const insertCourse = db.prepare(`INSERT INTO course
    (name, location, teacher_name, credits, course_type, study_mode, teacher_attitude, escape_difficulty, rollcall_methods, catch_tolerance_per_class, max_catch_limit, exam_weeks, notes)
    VALUES (@name, @location, @teacher_name, @credits, @course_type, @study_mode, @teacher_attitude, @escape_difficulty, @rollcall_methods, @catch_tolerance_per_class, @max_catch_limit, @exam_weeks, @notes)`);

const insertSchedule = db.prepare(`INSERT INTO course_schedule (course_id, weeks, day_of_week, period_slot)
    VALUES (@course_id, @weeks, @day_of_week, @period_slot)`);

const insertMemory = db.prepare(`INSERT INTO course_memory (course_id, snapshot_data)
    VALUES (@course_id, @snapshot_data)`);

let sid = 0;
for (const c of cfg.courses) {
    const r = insertCourse.run(c);
    const courseId = r.lastInsertRowid as number;
    const snaps: Array<{ schedule_id: number; weeks: number[]; day: number; period: string }> = [];
    for (const s of c.schedules) {
        const scheduleResult = insertSchedule.run({ course_id: courseId, weeks: JSON.stringify(FULL), day_of_week: s.day_of_week, period_slot: s.period_slot });
        sid = scheduleResult.lastInsertRowid as number;
        snaps.push({ schedule_id: sid, weeks: FULL, day: s.day_of_week, period: s.period_slot });
    }
    insertMemory.run({ course_id: courseId, snapshot_data: JSON.stringify({
        course_id: courseId, name: c.name,
        meta: { version: 1, updated_at: new Date().toISOString(), total_observations: 0, confidence_score: 0.3 },
        schedules: snaps,
        rollcall_model: { primary_method: c.rollcall_methods, frequency_model: { type: 'unknown', lambda: 0.3, confidence_interval: [0.1, 0.5] }, pattern_detected: false, last_observed_week: 0 },
        caught_history: { total: 0, by_week: {}, trend: 'stable', bayesian_posterior: { alpha: 1, beta: 1, expected_probability: 0.5 } },
        risk_signals: [], memory_budget: { used_chars: 0, limit_chars: 3000, utilization_pct: 0 },
    }) });
}

console.log(`✅ [${scenario}] ${cfg.description}`);
console.log(`   ${cfg.courses.length} 门课 ${sid} 课次 | 每周逃课目标: ${cfg.profile.weekly_skip_target} 节`);
console.log(`\n   运行: npx tsx scripts/generate-plan.ts`);
db.close();
