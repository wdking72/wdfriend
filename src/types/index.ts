// ============================================================
// LLM 接口
// ============================================================

export interface LLM {
  generate(systemPrompt: string, userMessage: string): Promise<string>;
}

// ============================================================
// Agent 相关类型
// ============================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface Tool extends ToolDefinition {
  execute(args: Record<string, unknown>): Promise<string>;
}

export interface ToolRegistryType {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): ToolDefinition[];
  execute(name: string, args: Record<string, unknown>): Promise<string>;
}

export interface AgentConfig {
  systemPrompt: string;
  maxIterations: number;
  tools: ToolRegistryType;
  llm: LLM;
}

export interface AgentStep {
  thought: string;
  action?: string;
  actionArgs?: Record<string, unknown>;
  observation?: string;
}

export interface AgentResult {
  answer: string;
  steps: AgentStep[];
}

// ============================================================
// 流式 Agent 回调类型
// ============================================================

export interface StreamChunk {
  type: "text" | "tool_start" | "tool" | "done" | "error";
  content: string;
  truncated?: boolean;
}

export type OnTokenCallback = (chunk: StreamChunk) => void;

// ============================================================
// 数据库实体类型
// ============================================================

export interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type MemoryCategory =
  | "personal"
  | "preference"
  | "experience"
  | "relationship"
  | "opinion"
  | "emotion"
  | "habit"
  | "goal"
  | "general";

export interface Memory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  content: string;
  source_message_ids: string[];
  importance: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// API 请求/响应类型
// ============================================================

export interface ChatRequest {
  conversationId: string;
  message: string;
}

export interface ChatStreamChunk {
  type: "text" | "tool_start" | "tool" | "done" | "error";
  content: string;
  truncated?: boolean;
  messageId?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
