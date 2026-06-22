import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServerClient } from "../../src/lib/supabase.js";

/**
 * POST /api/conversations
 * 创建新对话
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "只支持 POST" } });
  }

  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "缺少用户 ID" } });
    }

    const { title } = (req.body ?? {}) as { title?: string };

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title: title ?? "新对话",
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: { code: "DB_ERROR", message: error.message } });
    }

    return res.status(201).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
  }
}
