import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServerClient } from "../../../src/lib/supabase.js";

/**
 * GET /api/conversations/:id/messages
 * 获取对话的消息历史
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "只支持 GET" } });
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

    // 验证对话属于该用户
    const { data: conversation, error: fetchError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !conversation) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "对话不存在" } });
    }

    // 获取消息
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgError) {
      return res.status(500).json({ error: { code: "DB_ERROR", message: msgError.message } });
    }

    return res.status(200).json(messages);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
  }
}
