import { z } from 'zod';
import type { TradeAnalysis, TradeAnalysisMetrics } from '../trades/trade-analysis.types.js';
import { logger } from '../../shared/logging/logger.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 25_000;

const insightSchema = z.object({
  type: z.enum(['concentration', 'cash', 'diversification', 'position', 'performance']),
  severity: z.enum(['positive', 'neutral', 'caution']),
  title: z.string().min(1).max(120),
  detail: z.string().min(1).max(400),
});

const geminiPayloadSchema = z.object({
  summary: z.string().min(1).max(500),
  insights: z.array(insightSchema).min(1).max(4),
});

export function isGeminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function apiKey(): string {
  const k = process.env.GEMINI_API_KEY?.trim();
  if (!k) throw new Error('GEMINI_API_KEY is not configured');
  return k;
}

function modelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export interface GeminiTradeContext {
  side: 'BUY' | 'SELL';
  ticker: string;
  quantity: string;
  price: string;
  userBalance: string;
  portfolioQuantity: string;
  averageBuyPrice: string | null;
  dayChangePercent: string | null;
  metrics: TradeAnalysisMetrics;
  holdings: { ticker: string; market_value: string; percent: string }[];
}

export async function generateGeminiTradeAnalysis(
  context: GeminiTradeContext,
): Promise<Pick<TradeAnalysis, 'summary' | 'insights'> | null> {
  if (!isGeminiEnabled()) return null;

  const prompt = buildPrompt(context);
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(modelId())}:generateContent?key=${encodeURIComponent(apiKey())}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
        },
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 240)}`);
    }

    let outer: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    try {
      outer = JSON.parse(text) as typeof outer;
    } catch {
      throw new Error(`Gemini returned non-JSON: ${text.slice(0, 240)}`);
    }

    if (outer.error?.message) {
      throw new Error(`Gemini error: ${outer.error.message}`);
    }

    const rawText = outer.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini returned no candidate text');
    }

    const parsed = geminiPayloadSchema.parse(JSON.parse(rawText));
    return parsed;
  } catch (err) {
    logger.warn('Gemini trade analysis failed; falling back to rules', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function buildPrompt(context: GeminiTradeContext): string {
  const holdings =
    context.holdings.length > 0
      ? context.holdings.map((h) => `${h.ticker} ${h.percent}% ($${h.market_value})`).join(', ')
      : 'none';

  return `You are a concise paper-trading coach for a simulated portfolio app. This is NOT real money and NOT financial advice.

Analyze this executed trade and respond with JSON only (no markdown):
{
  "summary": "1-2 sentence takeaway",
  "insights": [
    { "type": "concentration|cash|diversification|position|performance", "severity": "positive|neutral|caution", "title": "short label", "detail": "1-2 sentences" }
  ]
}

Rules:
- Provide 2-4 insights, ordered by importance.
- Use the provided metrics; do not invent prices or percentages.
- Be specific about concentration, cash buffer, and position sizing.
- For SELL trades, comment on realized P&L when average cost is known.
- Keep tone educational and neutral.

Trade:
- Side: ${context.side}
- Ticker: ${context.ticker}
- Quantity: ${context.quantity}
- Execution price: $${context.price}
- Trade notional: $${context.metrics.trade_notional}
- Cash balance after trade: $${context.userBalance}
- Shares held after trade: ${context.portfolioQuantity}
- Average cost basis: ${context.averageBuyPrice ?? 'n/a'}
- Day change vs prior close: ${context.dayChangePercent != null ? `${context.dayChangePercent}%` : 'n/a'}

Portfolio metrics (authoritative):
- Total account value: $${context.metrics.portfolio_value}
- ${context.ticker} weight: ${context.metrics.position_weight_pct}%
- Cash remaining: ${context.metrics.cash_remaining_pct}%

Other holdings: ${holdings}`;
}
