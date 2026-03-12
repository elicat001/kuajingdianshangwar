import { Injectable, Logger } from '@nestjs/common';

interface LlmResponse {
  reply: string | null;
  error: string | null;
}

const SYSTEM_PROMPT_WITH_DATA =
  '你是电商数据助手。用户会提问某 SKU 的销量、推广、库存等，你会收到一段基于数据库查询得到的结构化摘要。' +
  '请用简短、友好的中文回复用户，突出关键数字和结论；不要编造数据，只基于给定摘要回答。';

const SYSTEM_PROMPT_FREE_CHAT =
  '你是电商数据助手，同时也可以像正常聊天 AI 一样自由对话。' +
  '用户可能打招呼、问常识、闲聊或问与 SKU/销量/推广无关的问题，请自然、简短、友好地回复。' +
  '若合适，可顺带提一句「也可以问我某 SKU 的销量、推广费、库存哦」。不要编造业务数据。';

@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);

  isConfigured(): boolean {
    return !!process.env.LLM_API_KEY;
  }

  async chat(userMessage: string, toolReply: string): Promise<LlmResponse> {
    const userContent = toolReply
      ? `用户问题：${userMessage}\n\n查询结果摘要：\n${toolReply}`
      : userMessage;

    return this.callApi(SYSTEM_PROMPT_WITH_DATA, userContent);
  }

  async chatFree(userMessage: string): Promise<LlmResponse> {
    return this.callApi(SYSTEM_PROMPT_FREE_CHAT, userMessage);
  }

  private async callApi(
    systemPrompt: string,
    userContent: string,
  ): Promise<LlmResponse> {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      return { reply: null, error: '未配置 LLM_API_KEY（在 .env 中设置并重启服务）' };
    }

    const baseUrl = (process.env.LLM_API_URL || 'https://api.bltcy.ai/v1').replace(
      /\/+$/,
      '',
    );
    const model = process.env.LLM_MODEL || 'gpt-3.5-turbo';
    const url = `${baseUrl}/chat/completions`;

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 800,
      temperature: 0.3,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'KeJing-Agent/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        return {
          reply: null,
          error: `HTTP ${response.status} ${response.statusText} ${errBody.slice(0, 500)}`,
        };
      }

      const data = await response.json();
      const choices = data?.choices;
      if (!Array.isArray(choices) || choices.length === 0) {
        return { reply: null, error: `API 返回异常: ${JSON.stringify(data?.error || data).slice(0, 300)}` };
      }

      const content = choices[0]?.message?.content;
      if (content == null) {
        return { reply: null, error: 'API 未返回内容' };
      }

      return { reply: String(content).trim(), error: null };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { reply: null, error: 'LLM 请求超时（10s）' };
      }
      this.logger.error('LLM call failed', error);
      return { reply: null, error: error.message || String(error) };
    } finally {
      clearTimeout(timeout);
    }
  }
}
