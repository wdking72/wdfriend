import { OpenAICompatibleLLM } from "./llm-openai.js";
import type { LLM } from "../types/index.js";

export interface LLMConfig {
  baseURL: string;
  model: string;
  apiKey: string;
}

/**
 * 创建 LLM 实例
 * 默认使用 OpenAI 兼容协议（支持小米 mimo、SiliconFlow 等）
 */
export function createLLM(config: LLMConfig): LLM {
  return new OpenAICompatibleLLM(config.baseURL, config.model, config.apiKey);
}
