export type TradeSide = 'BUY' | 'SELL';

export interface ExecuteTradeInput {
  userId: string;
  side: TradeSide;
  ticker: string;
  quantity?: string;
  notional?: string;
}

export interface TradePreviewInput {
  userId: string;
  side: TradeSide;
  ticker: string;
  quantity?: string;
  notional?: string;
}

export interface TradePreviewResult {
  side: TradeSide;
  ticker: string;
  quotePrice: string;
  quoteTimestamp: string;
  isQuoteStale: boolean;
  requestedQuantity?: string;
  requestedNotional?: string;
  estimatedQuantity: string;
  estimatedNotional: string;
  userBalance: string;
  currentHoldings: string;
  insufficientFunds: boolean;
  insufficientHoldings: boolean;
  canExecute: boolean;
}

export interface NormalizedTradeInput {
  userId: string;
  side: TradeSide;
  ticker: string;
  quantity: string;
  price: string;
}

export interface TradeExecutionResult {
  transactionId: string;
  side: TradeSide;
  ticker: string;
  quantity: string;
  price: string;
  userBalance: string;
  portfolioQuantity: string;
  averageBuyPrice: string | null;
  executedAt: string;
}
