export interface ToolResult {
  data: any | null;
  summary: string;
}

export abstract class AgentTool {
  abstract name: string;
  abstract execute(companyId: string, keyword: string): Promise<ToolResult>;
}
