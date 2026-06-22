import type { LLM } from "../types/index.js";

export interface MemoryMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
}

export type MemoryStrategy = "sliding-window" | "summarization";

export interface MemoryManagerConfig {
  strategy: MemoryStrategy;
  maxTurns?: number;          // sliding-window: 保留的最大轮数
  maxTokens?: number;         // summarization: 触发压缩的 token 阈值
}

/**
 * 对话记忆管理器
 * 支持两种策略：
 * - sliding-window: 保留最近 N 轮对话
 * - summarization: 当 token 超过阈值时，用 LLM 压缩旧对话为摘要
 */
export class MemoryManager {
  private messages: MemoryMessage[] = [];
  private config: MemoryManagerConfig;

  constructor(config?: Partial<MemoryManagerConfig>) {
    this.config = {
      strategy: config?.strategy ?? "sliding-window",
      maxTurns: config?.maxTurns ?? 20,
      maxTokens: config?.maxTokens ?? 3000,
    };
  }

  addMessage(message: MemoryMessage): void {
    this.messages.push(message);
  }

  addUser(content: string): void {
    this.addMessage({ role: "user", content });
  }

  addAssistant(content: string): void {
    this.addMessage({ role: "assistant", content });
  }

  addTool(toolCallId: string, content: string): void {
    this.addMessage({ role: "tool", content, tool_call_id: toolCallId });
  }

  addToolCalls(toolCalls: unknown[]): void {
    this.addMessage({ role: "assistant", content: "", tool_calls: toolCalls });
  }

  getMessages(): MemoryMessage[] {
    if (this.config.strategy === "sliding-window") {
      return this.applySlidingWindow();
    }
    return [...this.messages];
  }

  getStats(): { totalMessages: number; estimatedTokens: number } {
    const totalMessages = this.messages.length;
    const estimatedTokens = this.estimateTokens(
      this.messages.map((m) => m.content).join("\n")
    );
    return { totalMessages, estimatedTokens };
  }

  /**
   * 如果使用 summarization 策略，当 token 超过阈值时压缩旧消息
   */
  async compressIfNeeded(llm: LLM, systemPrompt: string): Promise<void> {
    if (this.config.strategy !== "summarization") return;

    const allContent = this.messages
      .filter((m) => m.role !== "system")
      .map((m) => m.content)
      .join("\n");
    const tokens = this.estimateTokens(allContent);

    if (tokens < (this.config.maxTokens ?? 3000)) return;

    // 提取前半部分的非系统消息进行压缩
    const nonSystem = this.messages.filter((m) => m.role !== "system");
    const half = Math.floor(nonSystem.length / 2);
    const toCompress = nonSystem.slice(0, half);
    const toKeep = nonSystem.slice(half);

    const conversationText = toCompress
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const summary = await llm.generate(
      systemPrompt,
      `请将以下对话压缩为简短摘要，保留关键信息：\n\n${conversationText}`
    );

    // 替换消息：摘要 + 保留的后半部分
    this.messages = [
      { role: "system", content: `[对话摘要] ${summary}` },
      ...toKeep,
    ];
  }

  private applySlidingWindow(): MemoryMessage[] {
    const systemMessages = this.messages.filter((m) => m.role === "system");
    const nonSystem = this.messages.filter((m) => m.role !== "system");
    const maxTurns = this.config.maxTurns ?? 20;
    const maxMessages = maxTurns * 2; // 每轮 = user + assistant

    if (nonSystem.length <= maxMessages) {
      return [...systemMessages, ...nonSystem];
    }

    const kept = nonSystem.slice(-maxMessages);
    return [...systemMessages, ...kept];
  }

  private estimateTokens(text: string): number {
    // 粗略估算：中文约 1.5 token/字，英文约 0.25 token/word
    const chineseChars = (text.match(/[一-鿿]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
  }
}
