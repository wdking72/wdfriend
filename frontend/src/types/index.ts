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

export interface StreamChunk {
  type: "text" | "tool_start" | "tool" | "done" | "error";
  content: string;
  truncated?: boolean;
}
