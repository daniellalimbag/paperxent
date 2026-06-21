import { Prisma } from '@prisma/client';
import { PortfoliosService } from '../portfolios/portfolios.service.js';
import { MarketService } from '../market/market.service.js';
import {
  generateGeminiTradeAnalysis,
  isGeminiEnabled,
  type GeminiTradeContext,
} from '../ai/gemini.service.js';
import type {
  TradeAnalysis,
  TradeAnalysisInsight,
  TradeAnalysisInput,
  TradeAnalysisMetrics,
} from './trade-analysis.types.js';

const CONCENTRATION_HIGH = 40;
const CONCENTRATION_MODERATE = 25;
const LOW_CASH_PCT = 10;

function pct(value: Prisma.Decimal, total: Prisma.Decimal): Prisma.Decimal {
  if (total.isZero()) return new Prisma.Decimal(0);
  return value.div(total).mul(100);
}

function fmtPct(n: Prisma.Decimal): string {
  return n.toFixed(1);
}

function fmtUsd(n: Prisma.Decimal): string {
  return n.toFixed(2);
}

interface AnalysisContext {
  input: TradeAnalysisInput;
  quantity: Prisma.Decimal;
  price: Prisma.Decimal;
  tradeNotional: Prisma.Decimal;
  cash: Prisma.Decimal;
  holdingsQty: Prisma.Decimal;
  portfolioValue: Prisma.Decimal;
  positionWeightPct: Prisma.Decimal;
  cashRemainingPct: Prisma.Decimal;
  dayChangePct: Prisma.Decimal | null;
  metrics: TradeAnalysisMetrics;
  holdings: GeminiTradeContext['holdings'];
}

export class TradeAnalysisService {
  constructor(
    private readonly portfoliosService = new PortfoliosService(),
    private readonly marketService = new MarketService(),
  ) {}

  async analyzeTrade(input: TradeAnalysisInput): Promise<TradeAnalysis> {
    const context = await this.buildContext(input);
    const ruleBased = this.buildRuleBasedAnalysis(context);

    if (isGeminiEnabled()) {
      const gemini = await generateGeminiTradeAnalysis({
        side: input.side,
        ticker: input.ticker,
        quantity: input.quantity,
        price: input.price,
        userBalance: input.userBalance,
        portfolioQuantity: input.portfolioQuantity,
        averageBuyPrice: input.averageBuyPrice,
        dayChangePercent: context.dayChangePct?.toFixed(2) ?? null,
        metrics: context.metrics,
        holdings: context.holdings,
      });

      if (gemini) {
        return {
          summary: gemini.summary,
          insights: gemini.insights,
          metrics: context.metrics,
          source: 'gemini',
        };
      }
    }

    return { ...ruleBased, source: 'rules' };
  }

  private async buildContext(input: TradeAnalysisInput): Promise<AnalysisContext> {
    const quantity = new Prisma.Decimal(input.quantity);
    const price = new Prisma.Decimal(input.price);
    const tradeNotional = quantity.mul(price);
    const cash = new Prisma.Decimal(input.userBalance);
    const holdingsQty = new Prisma.Decimal(input.portfolioQuantity);

    let securities = new Prisma.Decimal(0);
    let positionValue = holdingsQty.mul(price);
    let holdings: GeminiTradeContext['holdings'] = [];

    try {
      const valuation = await this.portfoliosService.getValuation({ userId: input.userId });
      securities = new Prisma.Decimal(valuation.totalPortfolioValue);
      const asset = valuation.assets.find((a) => a.ticker === input.ticker);
      if (asset) {
        positionValue = new Prisma.Decimal(asset.marketValue);
      }

      const total = cash.plus(securities);
      holdings = valuation.assets
        .map((a) => ({
          ticker: a.ticker,
          market_value: new Prisma.Decimal(a.marketValue).toFixed(2),
          percent: total.isZero()
            ? '0'
            : new Prisma.Decimal(a.marketValue).div(total).mul(100).toFixed(1),
        }))
        .sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent))
        .slice(0, 8);
    } catch {
      securities = holdingsQty.mul(price);
    }

    const portfolioValue = cash.plus(securities);
    const positionWeightPct = pct(positionValue, portfolioValue);
    const cashRemainingPct = pct(cash, portfolioValue);

    const quote = await this.marketService.getQuote({ ticker: input.ticker });
    const dayChangePct = quote?.changePercent
      ? new Prisma.Decimal(quote.changePercent).mul(100)
      : null;

    const metrics: TradeAnalysisMetrics = {
      position_weight_pct: fmtPct(positionWeightPct),
      cash_remaining_pct: fmtPct(cashRemainingPct),
      trade_notional: fmtUsd(tradeNotional),
      portfolio_value: fmtUsd(portfolioValue),
    };

    return {
      input,
      quantity,
      price,
      tradeNotional,
      cash,
      holdingsQty,
      portfolioValue,
      positionWeightPct,
      cashRemainingPct,
      dayChangePct,
      metrics,
      holdings,
    };
  }

  private buildRuleBasedAnalysis(context: AnalysisContext): Omit<TradeAnalysis, 'source'> {
    const { input, quantity, price, holdingsQty, positionWeightPct, cashRemainingPct, tradeNotional, dayChangePct, metrics } =
      context;

    const insights: TradeAnalysisInsight[] = [];

    if (input.side === 'BUY') {
      this.addBuyInsights({
        insights,
        ticker: input.ticker,
        holdingsQty,
        boughtQty: quantity,
        positionWeightPct,
        cashRemainingPct,
        tradeNotional,
        averageBuyPrice: input.averageBuyPrice,
        dayChangePct,
      });
    } else {
      this.addSellInsights({
        insights,
        ticker: input.ticker,
        holdingsQty,
        positionWeightPct,
        cashRemainingPct,
        tradeNotional,
        price,
        averageBuyPrice: input.averageBuyPrice,
        quantity,
      });
    }

    const summary = this.buildSummary(
      input.side,
      input.ticker,
      insights,
      positionWeightPct,
      cashRemainingPct,
    );

    return {
      summary,
      insights: insights.slice(0, 4),
      metrics,
    };
  }

  private addBuyInsights(args: {
    insights: TradeAnalysisInsight[];
    ticker: string;
    holdingsQty: Prisma.Decimal;
    boughtQty: Prisma.Decimal;
    positionWeightPct: Prisma.Decimal;
    cashRemainingPct: Prisma.Decimal;
    tradeNotional: Prisma.Decimal;
    averageBuyPrice: string | null;
    dayChangePct: Prisma.Decimal | null;
  }) {
    const {
      insights,
      ticker,
      holdingsQty,
      boughtQty,
      positionWeightPct,
      cashRemainingPct,
      tradeNotional,
      averageBuyPrice,
      dayChangePct,
    } = args;

    const priorHoldings = holdingsQty.minus(boughtQty);

    if (positionWeightPct.gte(CONCENTRATION_HIGH)) {
      insights.push({
        type: 'concentration',
        severity: 'caution',
        title: 'High concentration',
        detail: `${ticker} now represents ${fmtPct(positionWeightPct)}% of your account. Consider spreading risk across more holdings.`,
      });
    } else if (positionWeightPct.gte(CONCENTRATION_MODERATE)) {
      insights.push({
        type: 'concentration',
        severity: 'neutral',
        title: 'Growing position',
        detail: `${ticker} is ${fmtPct(positionWeightPct)}% of your portfolio. Monitor if you want to stay diversified.`,
      });
    } else {
      insights.push({
        type: 'diversification',
        severity: 'positive',
        title: 'Balanced sizing',
        detail: `${ticker} is ${fmtPct(positionWeightPct)}% of your account — a moderate slice of your paper portfolio.`,
      });
    }

    if (cashRemainingPct.lte(LOW_CASH_PCT) && !cashRemainingPct.isZero()) {
      insights.push({
        type: 'cash',
        severity: 'caution',
        title: 'Low cash buffer',
        detail: `Only ${fmtPct(cashRemainingPct)}% of your account remains in cash after this buy.`,
      });
    } else if (cashRemainingPct.gte(50)) {
      insights.push({
        type: 'cash',
        severity: 'positive',
        title: 'Healthy cash reserve',
        detail: `${fmtPct(cashRemainingPct)}% of your account is still available for future trades.`,
      });
    }

    if (priorHoldings.lte(0)) {
      insights.push({
        type: 'position',
        severity: 'neutral',
        title: 'New position opened',
        detail: `You deployed $${fmtUsd(tradeNotional)} into a new ${ticker} holding.`,
      });
    } else if (averageBuyPrice) {
      insights.push({
        type: 'position',
        severity: 'neutral',
        title: 'Added to existing holding',
        detail: `Your average cost basis is $${Number(averageBuyPrice).toFixed(2)} per share after this purchase.`,
      });
    }

    if (dayChangePct !== null) {
      const abs = dayChangePct.abs();
      if (abs.gte(3)) {
        insights.push({
          type: 'performance',
          severity: dayChangePct.gt(0) ? 'positive' : 'caution',
          title: dayChangePct.gt(0) ? 'Buying into momentum' : 'Buying a pullback',
          detail: `${ticker} is ${dayChangePct.gt(0) ? 'up' : 'down'} ${abs.toFixed(2)}% vs the prior close.`,
        });
      }
    }
  }

  private addSellInsights(args: {
    insights: TradeAnalysisInsight[];
    ticker: string;
    holdingsQty: Prisma.Decimal;
    positionWeightPct: Prisma.Decimal;
    cashRemainingPct: Prisma.Decimal;
    tradeNotional: Prisma.Decimal;
    price: Prisma.Decimal;
    averageBuyPrice: string | null;
    quantity: Prisma.Decimal;
  }) {
    const {
      insights,
      ticker,
      holdingsQty,
      positionWeightPct,
      cashRemainingPct,
      tradeNotional,
      price,
      averageBuyPrice,
      quantity,
    } = args;

    if (holdingsQty.isZero()) {
      insights.push({
        type: 'diversification',
        severity: 'positive',
        title: 'Position closed',
        detail: `You fully exited ${ticker} and freed $${fmtUsd(tradeNotional)} in cash.`,
      });
    } else {
      insights.push({
        type: 'position',
        severity: 'neutral',
        title: 'Partial trim',
        detail: `You still hold ${holdingsQty.toFixed(4)} shares of ${ticker} (${fmtPct(positionWeightPct)}% of portfolio).`,
      });
    }

    if (averageBuyPrice) {
      const avg = new Prisma.Decimal(averageBuyPrice);
      const pnlPerShare = price.minus(avg);
      const realizedPnl = pnlPerShare.mul(quantity);
      const roiPct = avg.isZero() ? new Prisma.Decimal(0) : pnlPerShare.div(avg).mul(100);

      insights.push({
        type: 'performance',
        severity: realizedPnl.gte(0) ? 'positive' : 'caution',
        title: realizedPnl.gte(0) ? 'Profitable exit' : 'Loss realized',
        detail: `Estimated P&L on this sell: ${realizedPnl.gte(0) ? '+' : ''}$${fmtUsd(realizedPnl)} (${roiPct.toFixed(1)}% vs avg cost).`,
      });
    }

    if (cashRemainingPct.gte(40)) {
      insights.push({
        type: 'cash',
        severity: 'positive',
        title: 'Cash increased',
        detail: `Cash is now ${fmtPct(cashRemainingPct)}% of your account after this sale.`,
      });
    }
  }

  private buildSummary(
    side: 'BUY' | 'SELL',
    ticker: string,
    insights: TradeAnalysisInsight[],
    positionWeightPct: Prisma.Decimal,
    cashRemainingPct: Prisma.Decimal,
  ): string {
    const caution = insights.some((i) => i.severity === 'caution');
    const positive = insights.some((i) => i.severity === 'positive');

    if (side === 'BUY') {
      if (caution) {
        return `Your ${ticker} buy went through, but concentration or cash levels deserve a closer look.`;
      }
      if (positive) {
        return `Nice execution — your ${ticker} position looks well-sized relative to the rest of your paper portfolio.`;
      }
      return `Buy filled. ${ticker} is now ${fmtPct(positionWeightPct)}% of your account with ${fmtPct(cashRemainingPct)}% in cash.`;
    }

    if (caution) {
      return `Sell completed. Review realized P&L and whether you still want exposure to ${ticker}.`;
    }
    return `Sell filled. You raised cash and ${ticker} now represents ${fmtPct(positionWeightPct)}% of your portfolio.`;
  }
}
