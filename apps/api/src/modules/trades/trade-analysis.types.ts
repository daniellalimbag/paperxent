import type { TradeSide } from './trades.types.js';

export type TradeAnalysisInsightType =
  | 'concentration'
  | 'cash'
  | 'diversification'
  | 'position'
  | 'performance';

export type TradeAnalysisSeverity = 'positive' | 'neutral' | 'caution';

export interface TradeAnalysisInsight {
  type: TradeAnalysisInsightType;
  severity: TradeAnalysisSeverity;
  title: string;
  detail: string;
}

export interface TradeAnalysisMetrics {
  position_weight_pct: string;
  cash_remaining_pct: string;
  trade_notional: string;
  portfolio_value: string;
}

export interface TradeAnalysis {
  summary: string;
  insights: TradeAnalysisInsight[];
  metrics: TradeAnalysisMetrics;
}

export interface TradeAnalysisInput {
  userId: string;
  side: TradeSide;
  ticker: string;
  quantity: string;
  price: string;
  userBalance: string;
  portfolioQuantity: string;
  averageBuyPrice: string | null;
}
