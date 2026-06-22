import OpenAI from "openai";
import type { LLM } from "../types/index.js";

/**
 * OpenAI 兼容 LLM 适配器
 * 支持任何 OpenAI 兼容的 API（小米 mimo、SiliconFlow 等）
 */
export class OpenAICompatibleLLM implements LLM {
  private client: OpenAI;
  private model: string;

  constructor(baseURL: string, model: string, apiKey: string) {
    this.client = new OpenAI({ baseURL, apiKey });
    this.model = model;
  }

  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }
}
