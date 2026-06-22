import { ref } from "vue";
import type { Memory } from "../types/index.js";

const memories = ref<Memory[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const categoryLabels: Record<string, string> = {
  personal: "👤 个人信息",
  preference: "⭐ 偏好",
  experience: "🌍 经历",
  relationship: "👥 人际关系",
  opinion: "💭 观点想法",
  emotion: "😊 情感状态",
  habit: "🔄 习惯",
  goal: "🎯 目标",
  general: "📌 其他",
};

/**
 * 记忆管理 composable
 */
export function useMemories() {
  const fetchMemories = async (userId: string, category?: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);

      const url = `/api/memories${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url, {
        headers: { "x-user-id": userId },
      });

      if (!res.ok) {
        throw new Error("获取记忆失败");
      }

      memories.value = await res.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "未知错误";
    } finally {
      isLoading.value = false;
    }
  };

  const deleteMemory = async (userId: string, memoryId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });

      if (!res.ok) {
        throw new Error("删除记忆失败");
      }

      memories.value = memories.value.filter((m) => m.id !== memoryId);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "未知错误";
      return false;
    }
  };

  const getCategoryLabel = (category: string): string => {
    return categoryLabels[category] ?? category;
  };

  const groupedMemories = () => {
    const groups = new Map<string, Memory[]>();
    for (const m of memories.value) {
      const list = groups.get(m.category) ?? [];
      list.push(m);
      groups.set(m.category, list);
    }
    return groups;
  };

  return {
    memories,
    isLoading,
    error,
    fetchMemories,
    deleteMemory,
    getCategoryLabel,
    groupedMemories,
  };
}
