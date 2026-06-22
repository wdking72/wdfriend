import type { Tool, ToolDefinition, ToolRegistryType } from "../types/index.js";

/**
 * 工具注册表
 * 管理 Agent 可用的工具
 */
export class ToolRegistry implements ToolRegistryType {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  async execute(name: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`工具不存在: ${name}`);
    }

    // 验证必填参数
    const required = tool.parameters.required ?? [];
    for (const param of required) {
      if (args[param] === undefined || args[param] === null) {
        throw new Error(`工具 ${name} 缺少必填参数: ${param}`);
      }
    }

    return tool.execute(args);
  }
}
