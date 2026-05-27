/** 默认基线 —— 所有课程无条件注入 */
export const DEFAULT_TEACHER_SKILL = 'default-strategy';

/** 态度标签 → 候选 skill 列表（按优先级排列，排前面的是更可能匹配的类型）。
 *  Modeler 收到全部候选，自己根据证据决定哪个最匹配 */
export const TEACHER_SKILL_CANDIDATES: Record<string, string[]> = {
  '严抓':   ['strict-old-school',       'random-sampling',        'default-strategy'],
  '理解':   ['easygoing-young',         'strict-old-school',     'default-strategy'],
  '懒得管':  ['never-rollcall',          'easygoing-young',       'default-strategy'],
  '不确定':  ['random-sampling',        'strict-old-school',     'never-rollcall', 'easygoing-young', 'default-strategy'],
};
