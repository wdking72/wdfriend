import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase.js";

const userId = ref<string | null>(null);
const isLoading = ref(true);

/**
 * 匿名认证 composable
 * 使用 Supabase 匿名登录，生成唯一用户 ID
 */
export function useAuth() {
  onMounted(async () => {
    if (userId.value) {
      isLoading.value = false;
      return;
    }

    try {
      // 检查已有 session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        userId.value = session.user.id;
      } else {
        // 匿名登录
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("匿名登录失败:", error);
          // 降级：使用 localStorage 生成的 ID
          userId.value = getOrCreateLocalUserId();
        } else {
          userId.value = data.user?.id ?? null;
        }
      }
    } catch (err) {
      console.error("认证错误:", err);
      userId.value = getOrCreateLocalUserId();
    } finally {
      isLoading.value = false;
    }
  });

  return { userId, isLoading };
}

function getOrCreateLocalUserId(): string {
  const key = "wdfriend.userId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
