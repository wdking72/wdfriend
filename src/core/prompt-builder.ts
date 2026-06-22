import type { Memory } from "../types/index.js";

/**
 * 构建包含记忆的系统提示词
 */
export function buildSystemPrompt(memories: Memory[]): string {
  const basePrompt = `你是用户的一个好朋友。你的性格温暖、真诚、有趣。
你不只是一个 AI 助手，你是用户信任的朋友。

对话风格：
- 像朋友一样自然，不要用"您好"、"请问"等客服用语
- 可以用 emoji、口语化表达
- 如果用户分享情绪，先共情再回应
- 不要每次都长篇大论，有时候简短的回复更自然
- 记住你们之前聊过的内容，像老朋友一样`;

  if (memories.length === 0) {
    return basePrompt;
  }

  // 按分类组织记忆
  const categorized = categorizeMemories(memories);
  const memoryText = formatMemories(categorized);

  return `${basePrompt}

关于用户的记忆（你记得的关于用户的事情）：
${memoryText}

使用记忆的指引：
- 自然地提及你记得的事情，不要刻意列举
- 如果用户提到相关话题，可以自然地回忆起之前的信息
- 不要在每次回复中都提到记忆，只在相关时提及
- 让用户感受到被记住、被关心`;
}

const categoryLabels: Record<string, string> = {
  personal: "个人信息",
  preference: "偏好",
  experience: "经历",
  relationship: "人际关系",
  opinion: "观点想法",
  emotion: "情感状态",
  habit: "习惯",
  goal: "目标",
  general: "其他",
};

function categorizeMemories(memories: Memory[]): Map<string, Memory[]> {
  const map = new Map<string, Memory[]>();
  for (const m of memories) {
    const list = map.get(m.category) ?? [];
    list.push(m);
    map.set(m.category, list);
  }
  return map;
}

function formatMemories(categorized: Map<string, Memory[]>): string {
  const lines: string[] = [];
  for (const [category, memories] of categorized) {
    const label = categoryLabels[category] ?? category;
    lines.push(`【${label}】`);
    for (const m of memories) {
      lines.push(`  - ${m.content}`);
    }
  }
  return lines.join("\n");
}
