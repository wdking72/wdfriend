import type { LLM, MemoryCategory } from "../types/index.js";

export interface ExtractedMemory {
  category: MemoryCategory;
  content: string;
  importance: number;
}

/**
 * 记忆提取器
 * 从对话中提取值得长期记住的信息
 */
export class MemoryExtractor {
  private llm: LLM;

  constructor(llm: LLM) {
    this.llm = llm;
  }

  /**
   * 从对话历史中提取记忆
   */
  async extract(
    messages: Array<{ role: string; content: string }>
  ): Promise<ExtractedMemory[]> {
    if (messages.length < 2) return []; // 至少需要一轮对话

    const conversationText = messages
      .map((m) => `${m.role === "user" ? "用户" : "AI"}: ${m.content}`)
      .join("\n");

    const prompt = `你是一个记忆提取器。分析以下对话，提取值得长期记住的关于用户的信息。

提取规则：
1. 只提取关于用户的重要信息（个人信息、偏好、经历、观点等）
2. 不要提取通用知识或 AI 的回复内容
3. 不要提取已经很明显的、一次性的信息（比如"今天天气不错"这种）
4. 每条记忆用一句自然语言描述
5. 标注分类和重要性（1-10）

分类说明：
- personal: 个人信息（名字、生日、职业、年龄等）
- preference: 偏好（喜欢的食物、音乐、电影、颜色等）
- experience: 经历（去过的地方、做过的事、工作经历等）
- relationship: 人际关系（家人、朋友、同事、宠物等）
- opinion: 观点想法（对某事的看法、价值观等）
- emotion: 情感状态（最近的心情、烦恼、开心的事等）
- habit: 习惯（作息、日常习惯、爱好等）
- goal: 目标（想做的事、计划、梦想等）
- general: 未分类

请严格按以下 JSON 格式输出，不要输出其他内容：
[{"category":"分类","content":"记忆内容","importance":重要性数字}]

如果对话中没有值得记住的信息，返回空数组：[]

对话内容：
${conversationText}`;

    try {
      const response = await this.llm.generate("", prompt);
      return this.parseResponse(response);
    } catch (err) {
      console.error("记忆提取失败:", err);
      return [];
    }
  }

  /**
   * 判断新记忆是否与已有记忆重复或冲突
   */
  async deduplicate(
    newMemory: ExtractedMemory,
    existingMemories: Array<{ id: string; category: string; content: string }>
  ): Promise<{ action: "skip" | "add" | "update"; targetId?: string; merged?: string }> {
    if (existingMemories.length === 0) {
      return { action: "add" };
    }

    const existingList = existingMemories
      .map((m) => `- [${m.category}] ${m.content} (ID: ${m.id})`)
      .join("\n");

    const prompt = `你是一个记忆去重器。判断新记忆是否与已有记忆重复或冲突。

新记忆：[${newMemory.category}] ${newMemory.content}

已有记忆：
${existingList}

判断规则：
1. 如果新记忆与某条已有记忆完全重复或非常相似 → 返回 {"action":"skip"}
2. 如果新记忆是某条已有记忆的更新版本（比如用户换了工作） → 返回 {"action":"update","targetId":"对应ID","merged":"合并后的内容"}
3. 如果是全新的信息 → 返回 {"action":"add"}

请严格按 JSON 格式输出，不要输出其他内容。`;

    try {
      const response = await this.llm.generate("", prompt);
      return this.parseDedupResponse(response);
    } catch {
      return { action: "add" }; // 出错时默认添加
    }
  }

  private parseResponse(response: string): ExtractedMemory[] {
    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (item) =>
            item.category &&
            item.content &&
            typeof item.importance === "number"
        )
        .map((item) => ({
          category: item.category as MemoryCategory,
          content: String(item.content),
          importance: Math.max(1, Math.min(10, item.importance)),
        }));
    } catch {
      return [];
    }
  }

  private parseDedupResponse(
    response: string
  ): { action: "skip" | "add" | "update"; targetId?: string; merged?: string } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: "add" };

      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.action === "skip") return { action: "skip" };
      if (parsed.action === "update" && parsed.targetId) {
        return { action: "update", targetId: parsed.targetId, merged: parsed.merged };
      }
      return { action: "add" };
    } catch {
      return { action: "add" };
    }
  }
}
