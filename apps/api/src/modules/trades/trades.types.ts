export type TradeSide = 'BUY' | 'SELL';

export interface ExecuteTradeInput {
  userId: string;
  side: TradeSide;
  ticker: string;
  quantity: string;
  price: string;
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
