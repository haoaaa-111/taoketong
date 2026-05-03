# SkipClass — 全局待办清单

> 最后更新: 2026-05-03  
> 规则: 每次 Session 开始/结束必须更新此文件

---

## 未完成

### 🟡 中优先级（正常推进）
- [ ] [施工文档] 14 个 Session 施工文档已创建，等待按顺序执行

## 已完成
- [x] [Session Plan] 项目施工文档体系创建 — @assistant | 2026-05-02
  - 创建 14 个 Session 级施工文档
  - 建立 `docs/superpowers/plans/` 文档库
- [x] [Onboarding 改进] Step1/2/3 改进全量上线 — @sisyphus | 2026-05-03
  - **Step1**: Parser prompt 改为 sessions[] 结构；同名课程合并；CourseGroup + Step1CourseGroup 组件；课次可标记为"特殊课次"；ScrollPicker 滚动年月选择器；解析结果可双击编辑；支持手动新增课程
  - **Step2**: 逃课动机新增"单纯想逃"+"自定义"；自定义选项弹出输入框；数字输入框修复（删除不自动补 0）
  - **Step3**: 点名方式"添加"按钮修复（基于 rollcall_methods.map 渲染）；新增"自定义"点名方式；点名频率新增"几乎不点"；备注 placeholder 更新为详细提示 + ⭐重要标识；parser.md 添加 notes 权重标注；step3 按课程名合并提交
  - **Type**: 新增 ParsedSession, ParsedCourseGroup, SessionEntry, CourseGroup 类型
  - **DB**: schema 无需改动（rollcall_methods 为 JSON 字段，自由扩展）
