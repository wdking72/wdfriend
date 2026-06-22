<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "./composables/useAuth.js";
import BottomNav from "./components/BottomNav.vue";

const { userId, isLoading } = useAuth();
const route = useRoute();

// 聊天室页面隐藏底部导航
const showNav = computed(() => route.name !== "chat-room");
</script>

<template>
  <div class="h-screen flex flex-col bg-background">
    <!-- 加载中 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-text-secondary text-sm">加载中...</div>
    </div>

    <!-- 主内容 -->
    <template v-else>
      <div class="flex-1 overflow-hidden">
        <router-view :user-id="userId" />
      </div>
      <BottomNav v-if="showNav" />
    </template>
  </div>
</template>
