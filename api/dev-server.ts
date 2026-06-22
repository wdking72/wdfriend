/**
 * 本地开发服务器
 * 模拟 Vercel Serverless Functions 的行为
 * 无需 Vercel 账号即可本地开发
 */

import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { pathToFileURL } from "url";

// 加载 .env.local
const envPath = resolve(import.meta.dirname ?? process.cwd(), "../.env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const API_DIR = resolve(import.meta.dirname ?? process.cwd(), ".");

// 路由映射
interface RouteMatch {
  handler: (req: any, res: any) => Promise<void>;
  params: Record<string, string>;
}

function matchRoute(method: string, pathname: string): RouteMatch | null {
  // 去掉 /api 前缀
  const path = pathname.replace(/^\/api/, "") || "/";

  // 精确匹配
  const exactPaths: Record<string, string> = {
    "/health": "health.get",
    "/conversations": method === "GET" ? "conversations/index.get" : "conversations/index.post",
    "/memories": "memories/index.get",
    "/chat/stream": "chat/stream.post",
  };

  if (exactPaths[path]) {
    const filePath = join(API_DIR, exactPaths[path] + ".ts");
    if (existsSync(filePath)) {
      return { handler: filePath, params: {} };
    }
  }

  // 动态匹配 /conversations/:id
  const convMatch = path.match(/^\/conversations\/([^/]+)$/);
  if (convMatch) {
    if (method === "DELETE") {
      const filePath = join(API_DIR, "conversations/[id].delete.ts");
      if (existsSync(filePath)) {
        return { handler: filePath, params: { id: convMatch[1] } };
      }
    }
  }

  // 动态匹配 /conversations/:id/messages
  const msgMatch = path.match(/^\/conversations\/([^/]+)\/messages$/);
  if (msgMatch && method === "GET") {
    const filePath = join(API_DIR, "conversations/[id]/messages.get.ts");
    if (existsSync(filePath)) {
      return { handler: filePath, params: { id: msgMatch[1] } };
    }
  }

  // 动态匹配 /memories/:id
  const memMatch = path.match(/^\/memories\/([^/]+)$/);
  if (memMatch && method === "DELETE") {
    const filePath = join(API_DIR, "memories/[id].delete.ts");
    if (existsSync(filePath)) {
      return { handler: filePath, params: { id: memMatch[1] } };
    }
  }

  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const method = req.method ?? "GET";

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 只处理 /api 路径
  if (!url.pathname.startsWith("/api")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }));
    return;
  }

  const route = matchRoute(method, url.pathname);
  if (!route) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: `Route not found: ${method} ${url.pathname}` } }));
    return;
  }

  try {
    // 解析请求体
    let body: unknown = undefined;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      body = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
          try {
            const text = Buffer.concat(chunks).toString();
            resolve(text ? JSON.parse(text) : undefined);
          } catch {
            resolve(undefined);
          }
        });
        req.on("error", reject);
      });
    }

    // 构造 Vercel 兼容的 req 对象
    const vercelReq: any = {
      method,
      query: Object.fromEntries(url.searchParams),
      headers: req.headers,
      body,
    };

    // 构造 Vercel 兼容的 res 对象
    const vercelRes: any = res;
    vercelRes.status = (code: number) => {
      res.statusCode = code;
      return vercelRes;
    };
    vercelRes.json = (data: unknown) => {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json");
      }
      res.end(JSON.stringify(data));
      return vercelRes;
    };
    vercelRes.send = (data: unknown) => {
      if (typeof data === "object") {
        return vercelRes.json(data);
      }
      res.end(data);
      return vercelRes;
    };

    // 动态导入并执行 handler
    const filePath = typeof route.handler === "string" ? route.handler : "";
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);
    const handler = mod.default;

    // 合并路由参数到 query
    vercelReq.query = { ...vercelReq.query, ...route.params };

    await handler(vercelReq, vercelRes);
  } catch (err) {
    console.error("API Error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: String(err) } }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 API 开发服务器启动: http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/api/health\n`);
});
