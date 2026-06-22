<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { Conversation } from "../types/index.js";

const props = defineProps<{ conversation: Conversation }>();
const emit = defineEmits<{ delete: [id: string] }>();
const router = useRouter();

const timeLabel = computed(() => {
  if (!props.conversation.last_message_at) return "";
  const date = new Date(props.conversation.last_message_at);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN");
});

const handleClick = () => {
  router.push(`/chat/${props.conversation.id}`);
};

const handleDelete = (e: Event) => {
  e.stopPropagation();
  emit("delete", props.conversation.id);
};
</script>

<template>
  <div
    @click="handleClick"
    class="flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition"
  >
    <!-- 头像 -->
    <div class="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-lg mr-3 flex-shrink-0">
      💬
    </div>

    <!-- 内容 -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-primary truncate">
          {{ conversation.title }}
        </h3>
        <span class="text-xs text-text-secondary ml-2 flex-shrink-0">
          {{ timeLabel }}
        </span>
      </div>
    </div>

    <!-- 删除按钮 -->
    <button
      @click="handleDelete"
      class="ml-2 p-1 text-text-secondary hover:text-red-500 transition opacity-0 group-hover:opacity-100"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
</template>
