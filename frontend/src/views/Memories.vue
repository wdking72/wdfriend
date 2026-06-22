<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useMemories } from "../composables/useMemories.js";

const props = defineProps<{ userId: string }>();
const router = useRouter();
const { memories, isLoading, error, fetchMemories, deleteMemory, getCategoryLabel, groupedMemories } = useMemories();

onMounted(() => {
  fetchMemories(props.userId);
});

const handleDelete = async (id: string) => {
  if (confirm("确定要删除这条记忆吗？")) {
    await deleteMemory(props.userId, id);
  }
};

const handleBack = () => {
  router.push("/");
};
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 顶部栏 -->
    <header class="flex items-center px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
      <button @click="handleBack" class="p-2 -ml-1 text-text-secondary hover:text-text-primary transition">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 class="flex-1 text-center text-sm font-medium text-text-primary">🧠 记忆</h2>
      <div class="w-9"></div>
    </header>

    <!-- 内容 -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <!-- 加载中 -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-text-secondary text-sm">加载中...</div>
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="flex items-center justify-center py-12">
        <div class="text-red-500 text-sm">{{ error }}</div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="memories.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <div class="text-5xl mb-4">🧠</div>
        <p class="text-text-secondary text-sm mb-1">还没有记忆</p>
        <p class="text-text-secondary text-xs">多和 AI 朋友聊天，它会记住关于你的事情</p>
      </div>

      <!-- 记忆列表（按分类分组） -->
      <div v-else class="space-y-6">
        <div v-for="[category, items] in groupedMemories()" :key="category">
          <h3 class="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
            {{ getCategoryLabel(category) }}
          </h3>
          <div class="space-y-2">
            <div
              v-for="memory in items"
              :key="memory.id"
              class="bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm group"
            >
              <div class="flex items-start justify-between">
                <p class="text-sm text-text-primary flex-1 leading-relaxed">
                  {{ memory.content }}
                </p>
                <button
                  @click="handleDelete(memory.id)"
                  class="ml-2 p-1 text-text-secondary hover:text-red-500 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="flex items-center mt-2 text-xs text-text-secondary">
                <span>重要性: {{ memory.importance }}/10</span>
                <span class="mx-2">·</span>
                <span>{{ new Date(memory.created_at).toLocaleDateString("zh-CN") }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
