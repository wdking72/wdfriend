<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const currentPath = computed(() => route.path);

const navItems = [
  { path: "/", icon: "💬", label: "对话" },
  { path: "/memories", icon: "🧠", label: "记忆" },
];

const navigate = (path: string) => {
  router.push(path);
};
</script>

<template>
  <nav class="flex-shrink-0 border-t border-gray-200 bg-white flex items-center justify-around py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
    <button
      v-for="item in navItems"
      :key="item.path"
      @click="navigate(item.path)"
      :class="[
        'flex flex-col items-center px-4 py-1.5 rounded-lg transition text-xs',
        currentPath === item.path
          ? 'text-accent-primary'
          : 'text-text-secondary hover:text-text-primary',
      ]"
    >
      <span class="text-lg mb-0.5">{{ item.icon }}</span>
      <span class="font-medium">{{ item.label }}</span>
    </button>
  </nav>
</template>
