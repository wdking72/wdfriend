<script setup lang="ts">
import { computed } from "vue";
import type { Message } from "../types/index.js";
import MarkdownRenderer from "./MarkdownRenderer.vue";

const props = defineProps<{ message: Message }>();

const isUser = computed(() => props.message.role === "user");
const isAssistant = computed(() => props.message.role === "assistant");
</script>

<template>
  <div :class="['flex', isUser ? 'justify-end' : 'justify-start']">
    <!-- AI 头像 -->
    <div v-if="isAssistant" class="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
      🤖
    </div>

    <!-- 气泡 -->
    <div
      :class="[
        'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-bubble-user text-white rounded-br-md'
          : 'bg-bubble-assistant text-text-primary rounded-bl-md shadow-sm border border-gray-100',
      ]"
    >
      <!-- 用户消息：纯文本 -->
      <div v-if="isUser" class="whitespace-pre-wrap break-words">{{ message.content }}</div>

      <!-- AI 消息：Markdown 渲染 -->
      <MarkdownRenderer v-else-if="isAssistant" :content="message.content" />

      <!-- 系统消息 -->
      <div v-else class="text-xs text-text-secondary italic">{{ message.content }}</div>

      <!-- 截断提示 -->
      <div v-if="message.metadata?.truncated" class="mt-2 text-xs text-text-secondary">
        ⚠️ 回复被截断
      </div>
    </div>
  </div>
</template>
