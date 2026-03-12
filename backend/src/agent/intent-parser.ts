import { Injectable } from '@nestjs/common';

export enum IntentType {
  SALES = 'sales',
  PROMOTION = 'promotion',
  INVENTORY = 'inventory',
  LINK_ANALYSIS = 'link_analysis',
  GREETING = 'greeting',
  GENERAL = 'general',
}

export interface ParsedIntent {
  intents: IntentType[];
  keyword: string | null;
}

const GREETING_PATTERNS = [
  '你好',
  '您好',
  '嗨',
  '在吗',
  '在不在',
  '哈喽',
  'hi',
  'hello',
  'hey',
  '早上好',
  '下午好',
  '晚上好',
  '谢谢',
  '感谢',
  '再见',
  '拜拜',
];

const DATA_KEYWORDS = ['销量', '推广', '库存', '分析', '查', '看', 'sk', 'sku'];

@Injectable()
export class IntentParser {
  parse(message: string): ParsedIntent {
    if (!message || typeof message !== 'string') {
      return { intents: [IntentType.GENERAL], keyword: null };
    }

    const text = message.trim();
    const lower = text.toLowerCase();

    // Greeting detection
    if (this.isGreeting(text, lower)) {
      return { intents: [IntentType.GREETING], keyword: null };
    }

    // Extract keyword
    const keyword = this.extractKeyword(text);

    // Classify intents
    const intents = this.classifyIntents(text, lower);

    // If no intent matched but we have a keyword, default to multi-intent
    if (intents.length === 0 && keyword) {
      return {
        intents: [IntentType.SALES, IntentType.PROMOTION, IntentType.LINK_ANALYSIS],
        keyword,
      };
    }

    if (intents.length === 0) {
      return { intents: [IntentType.GENERAL], keyword: keyword || null };
    }

    return { intents, keyword: keyword || text.substring(0, 64) };
  }

  private isGreeting(text: string, lower: string): boolean {
    if (!text || text.length > 30) return false;

    if (GREETING_PATTERNS.includes(lower)) return true;

    // Short messages without data keywords are treated as greetings
    if (lower.length <= 4 && !DATA_KEYWORDS.some((k) => lower.includes(k))) {
      return true;
    }

    return false;
  }

  private extractKeyword(text: string): string | null {
    // 1. Quoted strings: "xx", 「xx」, 'xx'
    let m = text.match(/[「"']([^」"']+)[」"']/);
    if (m) return m[1].trim();

    // 2. "XX的" pattern: e.g. "想看某某的销量"
    m = text.match(/(?:想看|查询|查一下|看看)?\s*([^\s的]+?)\s*的/);
    if (m) return m[1].trim();

    // 3. SKU-like token (alphanumeric, dash, underscore, plus, parentheses)
    m = text.match(/([A-Za-z0-9_\-+()]+)/);
    if (m) return m[1].trim();

    return null;
  }

  private classifyIntents(text: string, _lower: string): IntentType[] {
    const intents: IntentType[] = [];

    if (['销量', '销售', '件数', '已付款', '卖了多少'].some((k) => text.includes(k))) {
      intents.push(IntentType.SALES);
    }
    if (['推广', '花费', '广告', '推广费'].some((k) => text.includes(k))) {
      intents.push(IntentType.PROMOTION);
    }
    if (['库存', '可用库存'].some((k) => text.includes(k))) {
      intents.push(IntentType.INVENTORY);
    }
    if (['链接分析', 'SKU分析', '分析', '表现'].some((k) => text.includes(k))) {
      intents.push(IntentType.LINK_ANALYSIS);
    }

    return intents;
  }
}
