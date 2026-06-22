<script setup lang="ts">
import { ref } from "vue";

defineProps<{ isLoading: boolean }>();
const emit = defineEmits<{ send: [content: string]; cancel: [] }>();

const inputText = ref("");

const handleSend = () => {
  const content = inputText.value.trim();
  if (!content) return;
  emit("send", content);
  inputText.value = "";
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
</script>

<template>
  <div class="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
    <div class="flex items-end space-x-2">
      <textarea
        v-model="inputText"
        @keydown="handleKeydown"
        placeholder="说点什么..."
        rows="1"
        class="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition max-h-32"
        style="field-sizing: content;"
      ></textarea>

      <!-- 发送/取消按钮 -->
      <button
        v-if="isLoading"
        @click="$emit('cancel')"
        class="flex-shrink-0 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
      <button
        v-else
        @click="handleSend"
        :disabled="!inputText.trim()"
        class="flex-shrink-0 w-10 h-10 rounded-full bg-accent-primary text-white flex items-center justify-center hover:opacity-90 active:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</template>
