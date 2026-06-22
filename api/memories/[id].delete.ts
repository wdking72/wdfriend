import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServerClient } from "../../src/lib/supabase.js";

/**
 * DELETE /api/memories/:id
 * 删除某条记忆
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
      return res.status(400).json({ error: { code: "INVALID_ID", message: "缺少记忆 ID" } });
    }

    const supabase = createServerClient();

    // 验证记忆属于该用户
    const { data: memory, error: fetchError } = await supabase
      .from("memories")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !memory) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "记忆不存在" } });
    }

    // 删除记忆
    const { error: deleteError } = await supabase
      .from("memories")
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
