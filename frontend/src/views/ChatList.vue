<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useConversations } from "../composables/useConversations.js";
import ConversationItem from "../components/ConversationItem.vue";

const props = defineProps<{ userId: string }>();
const router = useRouter();
const { conversations, isLoading, fetchConversations, createConversation, deleteConversation } = useConversations();

onMounted(() => {
  fetchConversations(props.userId);
});

const handleNewChat = async () => {
  const conv = await createConversation(props.userId);
  if (conv) {
    router.push(`/chat/${conv.id}`);
  }
};

const handleDelete = async (id: string) => {
  await deleteConversation(props.userId, id);
};
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 顶部栏 -->
    <header class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <h1 class="text-lg font-semibold text-text-primary">💬 wdfriend</h1>
      <button
        @click="handleNewChat"
        class="px-4 py-2 bg-accent-primary text-white rounded-full text-sm font-medium hover:opacity-90 active:opacity-80 transition"
      >
        ＋ 新对话
      </button>
    </header>

    <!-- 对话列表 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 加载中 -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-text-secondary text-sm">加载中...</div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="conversations.length === 0" class="flex flex-col items-center justify-center py-12 px-4">
        <div class="text-4xl mb-4">🌟</div>
        <p class="text-text-secondary text-center mb-4">还没有对话</p>
        <button
          @click="handleNewChat"
          class="px-6 py-2 bg-accent-primary text-white rounded-full text-sm font-medium"
        >
          开始第一次聊天
        </button>
      </div>

      <!-- 对话列表 -->
      <div v-else class="divide-y divide-gray-100">
        <ConversationItem
          v-for="conv in conversations"
          :key="conv.id"
          :conversation="conv"
          @delete="handleDelete"
        />
      </div>
    </div>
  </div>
</template>
