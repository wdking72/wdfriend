<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChat } from "../composables/useChat.js";
import ChatBubble from "../components/ChatBubble.vue";
import ChatInput from "../components/ChatInput.vue";

const props = defineProps<{ userId: string }>();
const route = useRoute();
const router = useRouter();
const conversationId = route.params.id as string;

const { messages, isLoading, error, loadMessages, sendMessage, cancelMessage, clearMessages } = useChat();
const messagesContainer = ref<HTMLElement>();

// 自动滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(() => messages.value.length, scrollToBottom);
watch(() => messages.value[messages.value.length - 1]?.content, scrollToBottom);

onMounted(async () => {
  clearMessages();
  await loadMessages(props.userId, conversationId);
  await scrollToBottom();
});

onUnmounted(() => {
  cancelMessage();
});

const handleSend = async (content: string) => {
  await sendMessage(props.userId, conversationId, content);
  await scrollToBottom();
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
      <h2 class="flex-1 text-center text-sm font-medium text-text-primary">AI 朋友</h2>
      <div class="w-9"></div> <!-- 占位，保持标题居中 -->
    </header>

    <!-- 消息列表 -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
        <div class="text-5xl mb-4">👋</div>
        <p class="text-text-secondary text-sm">你好！我是你的 AI 朋友</p>
        <p class="text-text-secondary text-xs mt-1">随便聊聊吧～</p>
      </div>

      <!-- 消息气泡 -->
      <ChatBubble v-for="msg in messages" :key="msg.id" :message="msg" />

      <!-- 加载指示器 -->
      <div v-if="isLoading && messages[messages.length - 1]?.content === ''" class="flex items-center space-x-1 pl-12">
        <div class="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="px-4 py-2 bg-red-50 text-red-600 text-xs text-center">
      {{ error }}
    </div>

    <!-- 输入框 -->
    <ChatInput :is-loading="isLoading" @send="handleSend" @cancel="cancelMessage" />
  </div>
</template>
