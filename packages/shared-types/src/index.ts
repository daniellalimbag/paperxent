export type ServiceStatus = 'ok' | 'degraded' | 'down';

export interface HealthResponse {
  status: ServiceStatus;
  service: string;
  timestamp: string;
}

// Auth types
export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    balance: string;
    createdAt: string;
  };
  tokens: TokenPair;
}

// Trade types
export type TradeSide = 'BUY' | 'SELL';

export interface ExecuteTradeInput {
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

// Portfolio types
export interface PortfolioValuation {
  userId: string;
  totalValue: string;
  cashBalance: string;
  holdingsValue: string;
  totalGainLoss: string;
  totalGainLossPercent: string;
  holdings: Holding[];
}

export interface Holding {
  ticker: string;
  quantity: string;
  averageBuyPrice: string;
  currentPrice: string;
  marketValue: string;
  gainLoss: string;
  gainLossPercent: string;
}

// Market data types
export interface PriceTick {
  ticker: string;
  price: string;
  previousPrice: string;
  change: string;
  changePercent: string;
  timestamp: string;
}

// API response wrapper
export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  statusCode?: number;
}
