import { ref } from "vue";
import type { Conversation } from "../types/index.js";

const conversations = ref<Conversation[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

/**
 * 对话管理 composable
 */
export function useConversations() {
  const fetchConversations = async (userId: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const res = await fetch("/api/conversations", {
        headers: { "x-user-id": userId },
      });

      if (!res.ok) {
        throw new Error("获取对话列表失败");
      }

      conversations.value = await res.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "未知错误";
    } finally {
      isLoading.value = false;
    }
  };

  const createConversation = async (userId: string, title?: string): Promise<Conversation | null> => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ title: title ?? "新对话" }),
      });

      if (!res.ok) {
        throw new Error("创建对话失败");
      }

      const conversation: Conversation = await res.json();
      conversations.value.unshift(conversation);
      return conversation;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "未知错误";
      return null;
    }
  };

  const deleteConversation = async (userId: string, conversationId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });

      if (!res.ok) {
        throw new Error("删除对话失败");
      }

      conversations.value = conversations.value.filter((c) => c.id !== conversationId);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "未知错误";
      return false;
    }
  };

  return {
    conversations,
    isLoading,
    error,
    fetchConversations,
    createConversation,
    deleteConversation,
  };
}
