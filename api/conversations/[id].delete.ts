import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServerClient } from "../../src/lib/supabase.js";

/**
 * DELETE /api/conversations/:id
 * 删除对话及其所有消息
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "只支持 DELETE" } });
  }

  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "缺少用户 ID" } });
    }

    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: { code: "INVALID_ID", message: "缺少对话 ID" } });
    }

    const supabase = createServerClient();

    // 先验证对话属于该用户
    const { data: conversation, error: fetchError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !conversation) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "对话不存在" } });
    }

    // 删除对话（messages 会因 ON DELETE CASCADE 自动删除）
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return res.status(500).json({ error: { code: "DB_ERROR", message: deleteError.message } });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
  }
}
