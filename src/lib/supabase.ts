import { createClient } from "@supabase/supabase-js";

/**
 * 创建服务端 Supabase 客户端
 * 使用 SERVICE_ROLE_KEY，绕过 RLS（仅在 API 路由中使用）
 */
export function createServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量");
  }

  return createClient(url, key);
}
