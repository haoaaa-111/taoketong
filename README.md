# 逃课通

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6">
  <img alt="Status" src="https://img.shields.io/badge/status-active-success">
</p>

> *为了探索AI对人类心智的替代边界，我做了这个项目*

**输入课表截图，个人画像，搜集的学校信息，已知的课程详情---即可得到完整可实操的逃课方案**

---

*场景一*

*同龄人*：这节课早八，昨天没睡好，不去了 - 老师发现人少 - 点名 - 寄了

*我（用了逃课通）*：AI显示早八人少会点名，我先去一下，中午回来补觉 - 赚了

就很.......你们懂吧

价值在哪：

**科学决策，降低被点名的概率**

*场景二*

*同龄人*：下午那节水课到底去不去呢，真纠结啊，想了半天外卖都没点，算了还是不去了

*我（用了逃课通）*：AI根据我第一周的反馈总结老师脾气好，点名概率不大，被点了也没事，直接爽玩

就很.......你们懂吧

同样没被点名
价值在哪：

**砍掉你因为纠结浪费的时间，就算被抓，也不必内耗**

---

| | | |
|---|---|---|
| 实习（本地/异地） | -> | 给你一套性价比最高的代课方案 |
| 自习（考公/考研） | -> | 给你腾出最多的时间在图书馆冲击梦想 |
| 绩点（保研/留学） | -> | 将你的水课压缩，留出更多时间在学习之外 |
| 想玩（游戏/旅游） | -> | 科学旷课，犒劳辛苦的三年高中 |
| 及格（60分就够了） | -> | 我们的烦恼不是分低了，而是多上的那几节课变成了无用的分数 |
| 想逃却又不敢逃 | -> | AI虽然不能担责，却能让你不再纠结迈出第一步 |

---

## 接入 AI 编程 Agent

> **推荐方式。** AI 对话中直接使用，无需配置环境。

本项目内置 AgentSkill（位于 `skills/skipclass/`），可在常用 AI 编程工具中直接加载使用。

### Claude Code

```bash
git clone https://github.com/haoaaa-111/taoketong
cp -r taoketong/skills/skipclass/ ~/.claude/skills/
```

在 Claude Code 对话中说 **"帮我分析课表"** 即可触发。

### OpenCode

```bash
git clone https://github.com/haoaaa-111/taoketong
cp -r taoketong/skills/skipclass/ ~/.config/opencode/skills/
```

`skills/` 目录下的 skill 会被 OpenCode 自动发现，对话中直接匹配触发词。

### Codex

```bash
git clone https://github.com/haoaaa-111/taoketong
cp -r taoketong/skills/skipclass/ ~/.agents/skills/
```

### 其他工具

任何遵循 AgentSkills 标准的工具，将 `skills/skipclass/` 复制到对应的 skills 目录即可。Skill 流程详见 [`skills/skipclass/SKILL.md`](skills/skipclass/SKILL.md)。

---

## 核心设计

### 预测

综合教师类型建模、通用点名规律、学校特化规则，输出每节课的点名趋势。

核心：对于随机点名，预测自然状态下到课人数最少的课次->老师点名概率高->尽量不逃课

### 决策

直接给出三级行动分类——可逃 / 签到后走 / 必须到 / 代课。（必须到/代课由个人决定）

无需手动对照课表、翻记录、找代课群。


### 心智负担

自行逃课的心理负担来自为自己的决策担责。

本项目出方案将负担从「决定是否逃」转移为「执行策略」。

---

## 流程

```
导入课表截图（推荐前往学校教务官网截取完整课表，无需复杂格式文件导入） -> 设置偏好和定位 -> 粘贴学校攻略（可选）
    |
    v
AGENT 推理（harness理念，superviser排班，次要模型维护上下文）
    |
    v
生成逃课方案 -> 当场不满意打回重做 -> 依据用户喜好调整
    | 接受
    v
用户执行 -> 反馈（平安 / 被抓） -> memory更新，modeler提取规律建模
    |
    v
模型修正 -> 次周方案更精准
```

---

## 技术架构

```
Next.js 15 · TypeScript (strict) · Zod校验
OpenAI 兼容 API · 对于存储要求低的项目主动放弃传统db，全面转向结构化的markdown · 同时支持导入claudecode codex opencode等编程软件，在熟悉的环境进行轻量体验
```

### Agent 子系统

| 组件 | 职责 |
|------|------|
| Modeler | 逐课程评估逃课风险——依据课程元数据、评估框架、候选教师类型、学校特化规则、通用点名规律、历史事件提炼点名概率 |
| Supervisor | 依据modeler输出生成当周完整方案——8 层 prompt：综合画像、学期、课程、规则、事件、历史、约束、重试 |
| Memory Agent | 反馈闭环——解析用户反馈（未点/被抓/调整），自动写回课程数据和教师模板 |
| School Skill Generator | 将集市/小红书的学校攻略转化成skill——3 步 LLM pipeline：分析原文、融合通用模板、输出学校特化点名规律 |
| fs-store | Markdown 文件 CRUD——课程、画像、计划、历史、反馈均以结构化表格存储 |


设计理念：越用越好用，输入信息越多，执行反馈周期越长，输出计划越准确。

贯通harness理念，依据《Towards a Science of Scaling Agent Systems》基础，采用单体架构，Modeler为Superviser提供准确精炼的上下文，保持其attetion；Memory和Skill Generator持续更新记忆，提取点名规律，提供进化的harness环境。



## 附录：自托管部署

```bash
git clone https://github.com/haoaaa-111/taoketong
cd taoketong
npm install
```

```env
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
```

```bash
npm run dev
```

---

## 最后

大学四年 1,460 天。

你在课堂上大约度过 1,200 小时。

其中有多少时间，你在想的是"这课真没意思"而不是老师在讲什么？

**逃课通不鼓励逃课。它只是帮你把逃课这件事——做得更聪明一点。**

有时候，不去上课，才是对自己最大的负责。

