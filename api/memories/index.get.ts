import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServerClient } from "../../src/lib/supabase.js";

/**
 * GET /api/memories
 * 获取用户的记忆列表
 * 支持 ?category=xxx 筛选
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

    const { category, limit } = req.query;

    const supabase = createServerClient();
    let query = supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false });

    if (category && typeof category === "string") {
      query = query.eq("category", category);
    }

    if (limit && typeof limit === "string") {
      query = query.limit(parseInt(limit, 10));
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: { code: "DB_ERROR", message: error.message } });
    }

    return res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
  }
}
