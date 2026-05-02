# 逃课通（SkipClass）

> AI 驱动的个性化逃课方案生成器

## 功能特性

- 📸 **课表图片解析**：上传课表截图，AI 自动提取课程信息
- 🧠 **个性化画像**：根据你的逃课动机、频率偏好生成专属方案
- 🤖 **AI 智能排课**：综合考虑点名方式、老师风格、历史数据生成大胆方案
- ✅ **反馈闭环**：方案接受/打回/周后回顾，持续优化方案质量
- 🔒 **隐私优先**：所有数据存储在本地 SQLite，不上传任何信息

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript (Strict Mode) |
| 数据库 | SQLite (better-sqlite3) |
| LLM | OpenAI 兼容 API |
| UI | React + TailwindCSS（深色模式） |

## 快速开始

### 环境要求

- Node.js 20+
- 支持 OpenAI 兼容 API 的 LLM 服务

### 安装

```bash
# 1. 克隆/下载项目
cd skip-class

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填写 LLM API Key

# 4. 启动开发服务器
npm run dev
```

### 环境变量

```env
# LLM API 配置（必填）
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

### 首次使用

1. 打开浏览器访问 `http://localhost:3000`
2. 首次向导会引导你完成：
   - 课表图片导入
   - 用户画像设置
   - 课程信息校对
3. 完成后 AI 会自动生成首份方案

### 生产环境

```bash
npm run build
npm run start
```

## 数据

所有数据存储在 `./data/skipclass.db`，这是唯一的数据文件，可备份此文件进行迁移。

## License

MIT
