import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServerClient } from "../../src/lib/supabase.js";
import { createLLM } from "../../src/llm/index.js";
import { NativeToolAgent } from "../../src/core/agent-native.js";
import { MemoryManager } from "../../src/core/memory.js";
import type { StreamChunk } from "../../src/types/index.js";

/**
 * POST /api/chat/stream
 * 流式聊天接口（SSE）
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "只支持 POST" } });
  }

  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "缺少用户 ID" } });
    }

    const { conversationId, message } = (req.body ?? {}) as {
      conversationId?: string;
      message?: string;
    };

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "消息不能为空" } });
    }

    if (!conversationId || typeof conversationId !== "string") {
      return res.status(400).json({ error: { code: "INVALID_INPUT", message: "缺少对话 ID" } });
    }

    const supabase = createServerClient();

    // 验证对话属于该用户
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "对话不存在" } });
    }

    // 设置 SSE 响应头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Content-Encoding", "identity");
    res.status(200);

    // 加载历史消息用于上下文
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50); // 限制历史长度

    // 构建记忆管理器
    const memory = new MemoryManager({ strategy: "sliding-window", maxTurns: 15 });
    if (history) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          memory.addMessage({ role: msg.role, content: msg.content });
        }
      }
    }

    // 创建 LLM 和 Agent
    const llm = createLLM({
      baseURL: process.env.API_BASE_URL!,
      model: process.env.MODEL!,
      apiKey: process.env.API_KEY!,
    });

    const agent = new NativeToolAgent({
      baseURL: process.env.API_BASE_URL!,
      model: process.env.MODEL!,
      apiKey: process.env.API_KEY!,
      memory,
    });

    // 系统提示词
    const systemPrompt = `你是用户的一个好朋友。你的性格温暖、真诚、有趣。
你不只是一个 AI 助手，你是用户信任的朋友。

对话风格：
- 像朋友一样自然，不要用"您好"、"请问"等客服用语
- 可以用 emoji、口语化表达
- 如果用户分享情绪，先共情再回应
- 不要每次都长篇大论，有时候简短的回复更自然
- 记住你们之前聊过的内容，像老朋友一样`;

    agent.init(systemPrompt);

    // 保存用户消息到数据库
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    // 流式回复
    let fullResponse = "";

    const sendSSE = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    await agent.streamChat(message, (chunk: StreamChunk) => {
      if (chunk.type === "text") {
        fullResponse += chunk.content;
      }
      const eventName = chunk.type === "done" ? "done" : "token";
      sendSSE(eventName, chunk);
    });

    // 保存助手回复到数据库
    if (fullResponse) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: fullResponse,
      });

      // 更新对话的最后消息时间
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    res.write(`event: error\ndata: ${JSON.stringify({ type: "error", content: message })}\n\n`);
    res.end();
  }
}
