import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import type { OnTokenCallback, ToolRegistryType } from "../types/index.js";
import { MemoryManager } from "./memory.js";

export interface NativeToolAgentConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  registry?: ToolRegistryType;
  memory?: MemoryManager;
}

/**
 * 原生工具调用 Agent
 * 使用 OpenAI 兼容的 function calling 协议
 * 支持流式输出和多轮工具调用
 */
export class NativeToolAgent {
  private client: OpenAI;
  private model: string;
  private registry?: ToolRegistryType;
  private memory: MemoryManager;
  private initialized = false;
  private systemPrompt = "";

  constructor(config: NativeToolAgentConfig) {
    this.client = new OpenAI({ baseURL: config.baseURL, apiKey: config.apiKey });
    this.model = config.model;
    this.registry = config.registry;
    this.memory = config.memory ?? new MemoryManager();
  }

  /**
   * 初始化系统提示词（幂等，只设置一次）
   */
  init(systemPrompt: string): void {
    if (this.initialized) return;
    this.systemPrompt = systemPrompt;
    this.memory.addMessage({ role: "system", content: systemPrompt });
    this.initialized = true;
  }

  /**
   * 非流式聊天
   */
  async chat(userMessage: string): Promise<string> {
    this.ensureInit();
    this.memory.addUser(userMessage);

    const tools = this.getTools();
    const maxIterations = 5;

    for (let i = 0; i < maxIterations; i++) {
      const messages = this.memory.getMessages() as ChatCompletionMessageParam[];
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        max_tokens: 4096,
      });

      const msg = res.choices[0]?.message;
      if (!msg) throw new Error("LLM 返回为空");

      if (msg.tool_calls && msg.tool_calls.length > 0 && this.registry) {
        // 有工具调用
        this.memory.addToolCalls(msg.tool_calls);

        for (const tc of msg.tool_calls) {
          const args = JSON.parse(tc.function.arguments || "{}");
          const result = await this.registry.execute(tc.function.name, args);
          this.memory.addTool(tc.id, result);
        }
        continue; // 继续下一轮
      }

      // 无工具调用，返回答案
      const answer = msg.content ?? "";
      this.memory.addAssistant(answer);
      return answer;
    }

    throw new Error("达到最大迭代次数");
  }

  /**
   * 流式聊天（支持工具调用）
   */
  async streamChat(userMessage: string, onToken: OnTokenCallback): Promise<void> {
    this.ensureInit();
    this.memory.addUser(userMessage);

    const tools = this.getTools();
    const maxIterations = 5;

    for (let i = 0; i < maxIterations; i++) {
      const messages = this.memory.getMessages() as ChatCompletionMessageParam[];

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        stream: true,
        max_tokens: 4096,
      });

      let content = "";
      const toolCallAcc: Record<number, { id: string; name: string; arguments: string }> = {};

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // 文本内容
        if (delta.content) {
          content += delta.content;
          onToken({ type: "text", content: delta.content });
        }

        // 工具调用增量
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallAcc[idx]) {
              toolCallAcc[idx] = { id: "", name: "", arguments: "" };
            }
            if (tc.id) toolCallAcc[idx].id = tc.id;
            if (tc.function?.name) toolCallAcc[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallAcc[idx].arguments += tc.function.arguments;
          }
        }
      }

      // 如果有工具调用
      const toolCalls = Object.values(toolCallAcc);
      if (toolCalls.length > 0 && this.registry) {
        // 通知前端工具开始
        for (const tc of toolCalls) {
          onToken({ type: "tool_start", content: tc.name });
        }

        // 记录 assistant 的工具调用
        this.memory.addToolCalls(
          toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          }))
        );

        // 执行工具
        for (const tc of toolCalls) {
          const args = JSON.parse(tc.arguments || "{}");
          const result = await this.registry.execute(tc.name, args);
          this.memory.addTool(tc.id, result);
          onToken({ type: "tool", content: result });
        }

        continue; // 继续下一轮
      }

      // 无工具调用，完成
      if (content) {
        this.memory.addAssistant(content);
      }
      onToken({ type: "done", content: "" });
      return;
    }

    throw new Error("达到最大迭代次数");
  }

  /**
   * 获取当前记忆管理器
   */
  getMemory(): MemoryManager {
    return this.memory;
  }

  private ensureInit(): void {
    if (!this.initialized) {
      throw new Error("Agent 未初始化，请先调用 init(systemPrompt)");
    }
  }

  private getTools(): ChatCompletionTool[] {
    if (!this.registry) return [];
    return this.registry.list().map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }
}
