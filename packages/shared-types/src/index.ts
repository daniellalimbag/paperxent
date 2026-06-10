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

/** One row in GET /api/transactions/:userId */
export interface TransactionHistoryItem {
  id: string;
  userId: string;
  type: TradeSide;
  ticker: string;
  quantity: string;
  price: string;
  /** quantity × price */
  total: string;
  timestamp: string;
}

/** Cursor-based page from transaction list API */
export interface PaginatedResponse<T> {
  items: T[];
  /** Pass as `cursor` query param for the next page; null when no more rows */
  nextCursor: string | null;
  hasMore: boolean;
}

// Portfolio types (aligned with GET /api/portfolio response)
export interface AssetValuation {
  ticker: string;
  quantity: string;
  averageBuyPrice: string;
  latestPrice: string;
  costBasis: string;
  marketValue: string;
  unrealizedPnl: string;
  roi: string;
  pricedAt: string;
}

export interface PortfolioValuation {
  userId: string;
  totalCostBasis: string;
  totalPortfolioValue: string;
  totalUnrealizedPnl: string;
  totalRoi: string;
  assets: AssetValuation[];
  valuedAt: string;
}

// GET /api/analytics/:userId — snake_case keys match API JSON
export type AnalyticsRange = '7d' | '30d' | 'all';

export interface ValueOverTimePoint {
  date: string;
  total_account_value: string;
  is_live?: boolean;
}

export interface AllocationSlice {
  ticker: string;
  market_value: string;
  percent: string;
}

export interface PerAssetRoiPoint {
  ticker: string;
  roi: string;
  unrealized_pnl: string;
}

export interface PortfolioAnalyticsPayload {
  range: AnalyticsRange;
  value_over_time: ValueOverTimePoint[];
  allocation: AllocationSlice[];
  per_asset_roi: PerAssetRoiPoint[];
  valued_at: string;
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
