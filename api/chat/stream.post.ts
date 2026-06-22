import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServerClient } from "../../src/lib/supabase.js";
import { createLLM } from "../../src/llm/index.js";
import { NativeToolAgent } from "../../src/core/agent-native.js";
import { MemoryManager } from "../../src/core/memory.js";
import { MemoryExtractor } from "../../src/core/memory-extractor.js";
import { buildSystemPrompt } from "../../src/core/prompt-builder.js";
import type { StreamChunk, Memory } from "../../src/types/index.js";

/**
 * POST /api/chat/stream
 * 流式聊天接口（SSE）
 * 集成记忆系统：对话时注入记忆，对话后提取新记忆
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "只支持 GET" } });
  }

  let supabase: ReturnType<typeof createServerClient> | null = null;

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

    supabase = createServerClient();

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

    const sendSSE = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // 并行加载历史消息和用户记忆
    const [historyResult, memoriesResult] = await Promise.all([
      supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .order("importance", { ascending: false })
        .limit(50),
    ]);

    const history = historyResult.data ?? [];
    const memories = (memoriesResult.data ?? []) as Memory[];

    // 构建记忆管理器（加载历史消息上下文）
    const memory = new MemoryManager({ strategy: "sliding-window", maxTurns: 15 });
    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        memory.addMessage({ role: msg.role, content: msg.content });
      }
    }

    // 创建 LLM
    const llmConfig = {
      baseURL: process.env.API_BASE_URL!,
      model: process.env.MODEL!,
      apiKey: process.env.API_KEY!,
    };
    const llm = createLLM(llmConfig);

    // 构建包含记忆的系统提示词
    const systemPrompt = buildSystemPrompt(memories);

    // 创建 Agent
    const agent = new NativeToolAgent({ ...llmConfig, memory });
    agent.init(systemPrompt);

    // 保存用户消息到数据库
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    // 流式回复
    let fullResponse = "";

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

    // 异步提取记忆（不阻塞响应）
    if (fullResponse) {
      extractMemoriesAsync(userId, [
        { role: "user", content: message },
        { role: "assistant", content: fullResponse },
      ]).catch((err) => console.error("异步记忆提取失败:", err));
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "未知错误";
    res.write(`event: error\ndata: ${JSON.stringify({ type: "error", content: errMsg })}\n\n`);
    res.end();
  }
}

/**
 * 异步提取记忆（不阻塞主响应）
 */
async function extractMemoriesAsync(
  userId: string,
  messages: Array<{ role: string; content: string }>
) {
  try {
    const supabase = createServerClient();
    const llmConfig = {
      baseURL: process.env.API_BASE_URL!,
      model: process.env.MODEL!,
      apiKey: process.env.API_KEY!,
    };
    const llm = createLLM(llmConfig);
    const extractor = new MemoryExtractor(llm);

    // 提取新记忆
    const extracted = await extractor.extract(messages);
    if (extracted.length === 0) return;

    // 加载已有记忆用于去重
    const { data: existingMemories } = await supabase
      .from("memories")
      .select("id, category, content")
      .eq("user_id", userId)
      .limit(100);

    for (const newMemory of extracted) {
      // 去重检查
      const dedupResult = await extractor.deduplicate(
        newMemory,
        existingMemories ?? []
      );

      if (dedupResult.action === "skip") {
        continue;
      }

      if (dedupResult.action === "update" && dedupResult.targetId) {
        // 更新已有记忆
        await supabase
          .from("memories")
          .update({ content: dedupResult.merged ?? newMemory.content })
          .eq("id", dedupResult.targetId);
      } else {
        // 添加新记忆
        await supabase.from("memories").insert({
          user_id: userId,
          category: newMemory.category,
          content: newMemory.content,
          importance: newMemory.importance,
        });
      }
    }

    console.log(`为用户 ${userId} 提取了 ${extracted.length} 条记忆`);
  } catch (err) {
    console.error("记忆提取错误:", err);
  }
}
