import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { TradingSignal, TradingSignalAnalysis } from '../utils/types.js';

const MODEL_ID = 'google/gemini-1.5-flash';

const SYSTEM_PROMPT = `你是一个专业的加密货币技术分析师。请分析用户提供的 K 线截图，并输出以下 JSON 格式的交易信号。

请确保：
1. 只分析 1 小时时间框架的 K 线
2. 价格必须基于图片中的价格范围
3. 止损设置在关键支撑/阻力位
4. 盈亏比至少 1:1.5
5. 杠杆根据信号强度调整（强信号可用更高杠杆）
6. 如果信号不明确，返回 NEUTRAL
7. 所有价格必须与图片中的价格范围一致
8. 输出必须是有效的 JSON 格式，不包含任何其他文字`;

export async function analyzeKLineImage(imageBase64: string): Promise<TradingSignal> {
  const startTime = Date.now();

  const { text } = await generateText({
    model: gateway(MODEL_ID),
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请分析这张 K 线图并生成交易信号。只输出 JSON，不要其他文字。' },
          { type: 'image', image: imageBase64 },
        ],
      },
    ],
  });

  const processingTime = Date.now() - startTime;

  // 解析 AI 返回的 JSON
  let parsed: Partial<TradingSignal & { indicators: string[]; pattern: string; summary: string }>;
  try {
    const cleanText = text.trim().replace(/^```json\s*|\s*```$/g, '');
    parsed = JSON.parse(cleanText);
  } catch {
    parsed = {};
  }

  const analysis: TradingSignalAnalysis = {
    indicators: parsed.indicators || [],
    pattern: parsed.pattern || 'Unknown',
    summary: parsed.summary || 'AI generated trading signal based on chart analysis.',
  };

  return {
    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    direction: parsed.direction || 'NEUTRAL',
    confidence: parsed.confidence || 50,
    entryPrice: parsed.entryPrice || 0,
    takeProfit: parsed.takeProfit || 0,
    stopLoss: parsed.stopLoss || 0,
    positionSize: 1000,
    leverage: parsed.leverage || 5,
    riskRewardRatio: 2,
    analysis,
    sourceImageUrl: '',
    symbol: 'BTC/USDT',
    modelVersion: MODEL_ID,
    processingTime,
  };
}

export function isAIModelConfigured(): boolean {
  return !!process.env.AI_GATEWAY_API_KEY || !!process.env.GEMINI_API_KEY;
}

export function getAIModelVersion(): string {
  return MODEL_ID;
}
