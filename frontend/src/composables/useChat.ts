import { ref, nextTick } from "vue";
import type { Message, StreamChunk } from "../types/index.js";

const messages = ref<Message[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
let abortController: AbortController | null = null;

/**
 * 聊天 composable
 * 处理 SSE 流式对话
 */
export function useChat() {
  /**
   * 加载对话的历史消息
   */
  const loadMessages = async (userId: string, conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: { "x-user-id": userId },
      });

      if (!res.ok) {
        throw new Error("加载消息失败");
      }

      const data: Message[] = await res.json();
      messages.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "未知错误";
    }
  };

  /**
   * 发送消息并流式接收回复
   */
  const sendMessage = async (userId: string, conversationId: string, content: string) => {
    if (!content.trim() || isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    // 乐观更新：立即显示用户消息
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "user",
      content,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    messages.value.push(userMessage);

    // 添加空的助手消息（用于流式填充）
    const assistantIdx = messages.value.length;
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "assistant",
      content: "",
      metadata: {},
      created_at: new Date().toISOString(),
    };
    messages.value.push(assistantMessage);

    try {
      abortController = new AbortController();

      // 开发模式直接连后端，生产模式用相对路径
      const isDev = import.meta.env.DEV;
      const apiUrl = isDev
        ? "http://127.0.0.1:3001/api/chat/stream"
        : "/api/chat/stream";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ conversationId, message: content }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message ?? "请求失败");
      }

      // 解析 SSE 流
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const chunk: StreamChunk = JSON.parse(line.slice(6));
              await handleChunk(chunk, assistantIdx);
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 处理 buffer 中剩余的数据
      if (buffer.startsWith("data: ")) {
        try {
          const chunk: StreamChunk = JSON.parse(buffer.slice(6));
          await handleChunk(chunk, assistantIdx);
        } catch {
          // 忽略
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // 用户取消
        return;
      }
      error.value = err instanceof Error ? err.message : "未知错误";
      // 移除空的助手消息
      if (messages.value[assistantIdx]?.content === "") {
        messages.value.splice(assistantIdx, 1);
      }
    } finally {
      isLoading.value = false;
      abortController = null;
    }
  };

  /**
   * 取消当前请求
   */
  const cancelMessage = () => {
    abortController?.abort();
  };

  /**
   * 清空消息
   */
  const clearMessages = () => {
    messages.value = [];
    error.value = null;
  };

  return {
    messages,
    isLoading,
    error,
    loadMessages,
    sendMessage,
    cancelMessage,
    clearMessages,
  };
}

async function handleChunk(chunk: StreamChunk, assistantIdx: number) {
  switch (chunk.type) {
    case "text":
      // 通过 Vue Proxy 触发响应式更新
      messages.value[assistantIdx].content += chunk.content;
      await nextTick();
      break;
    case "tool_start":
      messages.value[assistantIdx].content += `\n\n⏳ 调用工具: ${chunk.content}\n`;
      await nextTick();
      break;
    case "tool":
      messages.value[assistantIdx].content += `${chunk.content}\n\n`;
      await nextTick();
      break;
    case "done":
      if (chunk.truncated) {
        messages.value[assistantIdx].metadata = { truncated: true };
      }
      break;
    case "error":
      throw new Error(chunk.content);
  }
}
