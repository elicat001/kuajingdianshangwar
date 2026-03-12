import { Injectable, Logger } from '@nestjs/common';
import { IntentParser, IntentType } from './intent-parser';
import { SalesTool } from './tools/sales-tool';
import { PromotionTool } from './tools/promotion-tool';
import { InventoryTool } from './tools/inventory-tool';
import { LinkAnalysisTool } from './tools/link-analysis-tool';
import { LlmClient } from './llm-client';
import { AgentTool, ToolResult } from './tools/base-tool';

const WELCOME_MESSAGE =
  '你好！我是数据助手，可以帮你查 SKU 的销量、推广费、库存或 SKU 分析。' +
  '试试问：想看 XX 的销量、查一下某某的推广费。';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly toolMap: Record<string, AgentTool>;

  constructor(
    private readonly intentParser: IntentParser,
    private readonly salesTool: SalesTool,
    private readonly promotionTool: PromotionTool,
    private readonly inventoryTool: InventoryTool,
    private readonly linkAnalysisTool: LinkAnalysisTool,
    private readonly llmClient: LlmClient,
  ) {
    this.toolMap = {
      [IntentType.SALES]: this.salesTool,
      [IntentType.PROMOTION]: this.promotionTool,
      [IntentType.INVENTORY]: this.inventoryTool,
      [IntentType.LINK_ANALYSIS]: this.linkAnalysisTool,
    };
  }

  async chat(
    companyId: string,
    message: string,
  ): Promise<{
    reply: string;
    data: Record<string, any> | null;
    llmConfigured: boolean;
    llmUsed: boolean;
    llmError: string | null;
  }> {
    if (!message || !message.trim()) {
      return {
        reply: '请输入您想查询的内容，例如：想看 XX SKU 的销量和推广数据。',
        data: null,
        llmConfigured: this.llmClient.isConfigured(),
        llmUsed: false,
        llmError: null,
      };
    }

    const trimmed = message.trim();
    const parsed = this.intentParser.parse(trimmed);
    const llmConfigured = this.llmClient.isConfigured();

    // Handle greetings
    if (parsed.intents.includes(IntentType.GREETING)) {
      return this.handleGreeting(trimmed, llmConfigured);
    }

    // Handle general (no actionable intent, no keyword)
    if (parsed.intents.includes(IntentType.GENERAL) && !parsed.keyword) {
      return this.handleGeneral(trimmed, llmConfigured);
    }

    // Execute tools for each intent
    const keyword = parsed.keyword || trimmed.substring(0, 64);
    const results: ToolResult[] = [];
    const dataOut: Record<string, any> = {};

    for (const intent of parsed.intents) {
      const tool = this.toolMap[intent];
      if (!tool) continue;

      try {
        const result = await tool.execute(companyId, keyword);
        results.push(result);
        if (result.data) {
          dataOut[intent] = result.data;
        }
      } catch (error) {
        this.logger.error(`Tool ${intent} failed`, error);
        results.push({
          data: null,
          summary: `${intent} 查询异常：${error.message || error}`,
        });
      }
    }

    const hasData = Object.keys(dataOut).length > 0;
    const summaries = results.map((r) => r.summary).join('\n\n');
    let reply = summaries || `未命中：已根据「${keyword}」查询，无销量、推广、库存或 SKU 分析数据。`;
    let llmUsed = false;
    let llmError: string | null = null;

    if (llmConfigured) {
      if (hasData) {
        // LLM to polish the tool results
        const llmResult = await this.llmClient.chat(trimmed, summaries);
        if (llmResult.reply) {
          reply = llmResult.reply;
          llmUsed = true;
        }
        llmError = llmResult.error;
      } else {
        // No data found, let LLM free-chat
        const llmResult = await this.llmClient.chatFree(trimmed);
        if (llmResult.reply) {
          reply = llmResult.reply;
          llmUsed = true;
        } else {
          reply = `暂未查到与「${keyword}」相关的数据，请确认 SKU/品名或到报表页查看。`;
        }
        llmError = llmResult.error;
      }
    } else {
      if (!hasData) {
        reply = `已根据「${keyword}」查询，但未命中销量、推广、库存或 SKU 分析数据。请确认 SKU/品名是否正确，或到对应报表页查看。`;
      }
      llmError = '未配置 LLM_API_KEY（在 .env 中设置并重启服务）';
    }

    return {
      reply,
      data: hasData ? dataOut : null,
      llmConfigured,
      llmUsed,
      llmError,
    };
  }

  private async handleGreeting(
    message: string,
    llmConfigured: boolean,
  ) {
    let reply = WELCOME_MESSAGE;
    let llmUsed = false;
    let llmError: string | null = null;

    if (llmConfigured) {
      const result = await this.llmClient.chatFree(message);
      if (result.reply) {
        reply = result.reply;
        llmUsed = true;
      }
      llmError = result.error;
    } else {
      llmError = '未配置 LLM_API_KEY（在 .env 中设置并重启服务）';
    }

    return { reply, data: null, llmConfigured, llmUsed, llmError };
  }

  private async handleGeneral(
    message: string,
    llmConfigured: boolean,
  ) {
    let reply = WELCOME_MESSAGE;
    let llmUsed = false;
    let llmError: string | null = null;

    if (llmConfigured) {
      const result = await this.llmClient.chatFree(message);
      if (result.reply) {
        reply = result.reply;
        llmUsed = true;
      }
      llmError = result.error;
    } else {
      llmError = '未配置 LLM_API_KEY（在 .env 中设置并重启服务）';
    }

    return { reply, data: null, llmConfigured, llmUsed, llmError };
  }
}
