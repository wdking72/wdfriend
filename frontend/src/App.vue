<script setup lang="ts">
import { useAuth } from "./composables/useAuth.js";

const { userId, isLoading } = useAuth();
</script>

<template>
  <div class="h-screen flex flex-col bg-background">
    <!-- 加载中 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-text-secondary text-sm">加载中...</div>
    </div>

    <!-- 主内容 -->
    <router-view v-else :user-id="userId" />
  </div>
</template>
