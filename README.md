# wdfriend 💬

有记忆的 AI 朋友 — 像朋友一样聊天，记住你，记住你们的回忆。

## 技术栈

- **前端**：Vue 3 + Vite + Tailwind CSS
- **后端**：Vercel Serverless Functions
- **数据库**：Supabase (PostgreSQL)
- **LLM**：小米 mimo-v2.5（OpenAI 兼容协议）
- **部署**：Vercel PWA

## 本地开发

### 1. 安装依赖

```bash
npm install
cd frontend && npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入你的配置：

```bash
cp .env.local.example .env.local
```

同样配置前端环境变量：

```bash
cd frontend
cp .env.example .env
```

### 3. 初始化数据库

在 Supabase SQL Editor 中执行 `supabase/migrations/001_initial_schema.sql`

### 4. 启动开发服务器

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:api    # API (端口 3001)
npm run dev:front  # 前端 (端口 5173)
```

## 项目结构

```
wdfriend/
├── api/                    # Vercel Serverless API 路由
├── frontend/               # Vue 3 SPA
├── src/                    # 共享代码（LLM、Agent、类型）
├── supabase/               # 数据库迁移
├── vercel.json             # Vercel 配置
└── .env.local              # 环境变量（不提交）
```

## 功能

- 🗣️ 自然对话（流式输出）
- 🧠 长期记忆（从对话中提取关于你的信息）
- 📱 移动端优先 PWA
- 🔐 匿名认证
- 💾 对话持久化
