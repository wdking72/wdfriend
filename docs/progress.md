# wdfriend 开发进度与计划

> 最后更新：2026-06-22

## 项目信息

- **项目名称**：wdfriend（有记忆的 AI 朋友）
- **仓库**：https://github.com/wdking72/wdfriend
- **技术栈**：Vue 3 + Vite + Tailwind | 自建 Node.js API | Supabase (PostgreSQL) | 小米 mimo-v2.5

---

## 已完成

### Phase 1：基础设施 ✅
- [x] 项目初始化（package.json, tsconfig, .gitignore）
- [x] 共享代码层：LLM 接口、OpenAI 兼容适配器、流式 Agent、记忆管理、工具注册表
- [x] Supabase 数据库迁移脚本（profiles/conversations/messages/memories 四张表 + RLS）
- [x] Vercel API 路由：health、对话 CRUD、流式聊天 (SSE)
- [x] Vue 3 前端：对话列表、聊天室、消息气泡、Markdown 渲染、SSE 流式解析
- [x] 匿名认证（Supabase Auth + localStorage 降级）
- [x] TypeScript 类型检查通过，前端构建成功

### Phase 3：记忆系统 ✅
- [x] 记忆提取器（memory-extractor.ts）：LLM 分析对话提取值得记住的信息
- [x] Prompt 组装器（prompt-builder.ts）：将记忆按分类注入系统提示词
- [x] 记忆 API 路由：GET /api/memories, DELETE /api/memories/:id
- [x] 聊天 API 集成：对话时注入记忆，对话后异步提取新记忆
- [x] 记忆管理页面（Memories.vue）：按分类分组展示、删除记忆
- [x] 底部导航栏（BottomNav.vue）：对话/记忆切换

### 开发工具 ✅
- [x] 本地开发服务器（api/dev-server.ts）：无需 Vercel 账号即可本地开发
- [x] Supabase 已配置（URL + Keys 已写入 .env.local）

---

## 待完成

### Phase 2：端到端测试（优先）
- [ ] 启动项目验证完整对话流程
- [ ] 验证记忆提取是否正常工作
- [ ] 验证记忆注入是否影响 AI 回复
- [ ] 修复可能的 bug

### Phase 4：移动端 UI + PWA
- [ ] 移动端布局优化（触摸交互、键盘弹起适配）
- [ ] PWA 配置（manifest.json + Service Worker）
- [ ] 可安装到手机桌面
- [ ] 深色模式支持
- [ ] 消息长按复制
- [ ] 对话左滑删除

### Phase 5：打磨 & 部署
- [ ] 错误处理完善（网络断开、API 限流等）
- [ ] 性能优化（消息分页加载、记忆缓存）
- [ ] Vercel 部署配置
- [ ] 环境变量配置（Vercel 环境变量）
- [ ] 最终测试

### 二期功能（未来）
- [ ] 图片上传
- [ ] 文件上传
- [ ] 语音输入
- [ ] 用户登录（邮箱/手机/第三方）
- [ ] 对话标题自动更新（从首条消息生成）
- [ ] 记忆搜索
- [ ] 对话摘要（长期对话压缩）

---

## 环境配置

### .env.local（根目录）
```
API_BASE_URL=https://api.xiaomimimo.com/v1
API_KEY=<小米 mimo API Key>
MODEL=mimo-v2.5
SUPABASE_URL=https://msoxeuedvntodtdbirts.supabase.co
SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>
```

### frontend/.env（前端）
```
VITE_SUPABASE_URL=https://msoxeuedvntodtdbirts.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase anon key>
```

---

## 启动命令

```bash
cd D:\wdfriend
npm run dev
```

- API 服务：http://localhost:3001
- 前端：http://localhost:5173

---

## 已知问题

1. **Supabase 匿名登录**：需要在 Supabase Dashboard → Authentication → Providers → Email 中开启 "Allow anonymous sign-ins"
2. **Service Role Key 格式**：用户提供的 key 格式为 `sb_secret_...`，如果 API 调用失败需要确认 key 是否完整
3. **前端 chunk 大小警告**：ChatRoom.vue 的 Markdown 渲染库较大，构建时有 warning，不影响功能

---

## 文件结构

```
D:\wdfriend/
├── api/                              # API 路由
│   ├── dev-server.ts                # 本地开发服务器
│   ├── health.get.ts
│   ├── chat/stream.post.ts          # 流式聊天（集成记忆系统）
│   ├── conversations/
│   │   ├── index.get.ts
│   │   ├── index.post.ts
│   │   ├── [id].delete.ts
│   │   └── [id]/messages.get.ts
│   └── memories/
│       ├── index.get.ts
│       └── [id].delete.ts
├── frontend/                         # Vue 3 SPA
│   └── src/
│       ├── views/
│       │   ├── ChatList.vue         # 对话列表
│       │   ├── ChatRoom.vue         # 聊天室
│       │   └── Memories.vue         # 记忆管理
│       ├── components/
│       │   ├── ChatBubble.vue       # 消息气泡
│       │   ├── ChatInput.vue        # 输入框
│       │   ├── ConversationItem.vue # 对话列表项
│       │   ├── MarkdownRenderer.vue # Markdown 渲染
│       │   └── BottomNav.vue        # 底部导航
│       ├── composables/
│       │   ├── useAuth.ts           # 匿名认证
│       │   ├── useConversations.ts  # 对话管理
│       │   ├── useChat.ts           # SSE 流式聊天
│       │   └── useMemories.ts       # 记忆管理
│       └── lib/
│           └── supabase.ts          # Supabase 客户端
├── src/                              # 共享代码
│   ├── llm/
│   │   ├── llm-openai.ts           # OpenAI 兼容 LLM
│   │   └── index.ts
│   ├── core/
│   │   ├── agent-native.ts         # 流式 Agent
│   │   ├── memory.ts               # 对话记忆管理
│   │   ├── memory-extractor.ts     # 记忆提取器
│   │   ├── prompt-builder.ts       # Prompt 组装器
│   │   └── tool-registry.ts        # 工具注册表
│   ├── lib/
│   │   └── supabase.ts             # 服务端 Supabase 客户端
│   └── types/
│       └── index.ts                # 类型定义
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # 数据库迁移
├── vercel.json                       # Vercel 配置（部署时用）
├── .env.local                        # 环境变量（不提交）
└── package.json
```
