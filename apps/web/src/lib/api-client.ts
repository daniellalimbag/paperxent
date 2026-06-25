import type {
  ApiSuccessResponse,
  PortfolioValuation,
  ExecuteTradeInput,
  TradeExecutionResult,
  TradePreviewInput,
  TradePreviewResult,
  AuthResponse,
  RegisterInput,
  LoginInput,
  PaginatedResponse,
  TransactionHistoryItem,
  TradeSide,
  AnalyticsRange,
  PortfolioAnalyticsPayload,
  WatchlistItem,
  PaperAlert,
  PaperAlertsPayload,
  PaperAlertType,
  UserSettings,
} from '@paperxent/shared-types';

import { getPublicApiUrl } from '@/lib/public-env';
import { getUpstreamApiUrl } from '@/lib/upstream-api';

const PROXY_PREFIX = '/proxy';

function persistUser(user: AuthResponse['user']): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

function clearUserFromStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('user');
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API may return `{ error: "string" }` (auth routes) or `{ error: { code, message } }` (error handler).
 * Shared-types `ApiErrorResponse` only documents the string form; normalize here.
 */
function messageFromErrorBody(body: unknown): { message: string; code?: string } {
  if (typeof body !== 'object' || body === null) {
    return { message: 'Something went wrong. Try again, or confirm the API server is running.' };
  }
  const record = body as Record<string, unknown>;

  if (typeof record.message === 'string' && record.message.trim()) {
    return { message: record.message };
  }

  const err = record.error;
  if (typeof err === 'string') {
    return { message: err };
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') {
      const code = (err as { code?: unknown }).code;
      const out: { message: string; code?: string } = { message: msg };
      if (typeof code === 'string') {
        out.code = code;
      }
      return out;
    }
  }
  return {
    message:
      'The server returned an error without details. Check that the PaperXent API is running and that NEXT_PUBLIC_API_URL / API_INTERNAL_URL point to it.',
  };
}

function resolveRequestUrl(endpoint: string): string {
  if (typeof window !== 'undefined') {
    return `${PROXY_PREFIX}${endpoint}`;
  }
  return `${getUpstreamApiUrl()}${endpoint}`;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = resolveRequestUrl(endpoint);
  const isBrowser = typeof window !== 'undefined';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  let response: Response;
  try {
    const fetchInit: RequestInit = {
      ...options,
      headers,
    };
    if (isBrowser) {
      fetchInit.credentials = 'include';
    }
    response = await fetch(url, fetchInit);
  } catch (e) {
    const publicUrl = getPublicApiUrl();
    const hint = isBrowser
      ? `Cannot reach the app API proxy at ${PROXY_PREFIX}. Ensure the Next.js dev server is running. The server proxies to ${getUpstreamApiUrl()} (set API_INTERNAL_URL in production).`
      : `Cannot reach API at ${getUpstreamApiUrl()} (server-side request). Set API_INTERNAL_URL or NEXT_PUBLIC_API_URL. Public browser URL is ${publicUrl}.`;
    const message = e instanceof TypeError ? hint : e instanceof Error ? e.message : 'Network error';
    throw new ApiError(message, 0, 'NETWORK');
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const { message, code } = messageFromErrorBody(body);
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

// Auth API (httpOnly cookies via Next Route Handlers; user snapshot in localStorage for UI)
export const authApi = {
  async register(input: RegisterInput): Promise<{ user: AuthResponse['user'] }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as { user?: AuthResponse['user'] };
    if (!res.ok) {
      const { message, code } = messageFromErrorBody(data);
      throw new ApiError(message, res.status, code);
    }
    if (!data.user) {
      throw new ApiError('Invalid register response', res.status);
    }
    try {
      persistUser(data.user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      throw new ApiError(
        `Could not save session in the browser (${msg}). Check that storage is allowed for this site.`,
        0,
        'SESSION_PERSIST'
      );
    }
    return { user: data.user };
  },

  async login(input: LoginInput): Promise<{ user: AuthResponse['user'] }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as { user?: AuthResponse['user'] };
    if (!res.ok) {
      const { message, code } = messageFromErrorBody(data);
      throw new ApiError(message, res.status, code);
    }
    if (!data.user) {
      throw new ApiError('Invalid login response', res.status);
    }
    try {
      persistUser(data.user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      throw new ApiError(
        `Could not save session in the browser (${msg}). Check that storage is allowed for this site.`,
        0,
        'SESSION_PERSIST'
      );
    }
    return { user: data.user };
  },

  async refresh(): Promise<{ user: AuthResponse['user'] }> {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = (await res.json().catch(() => ({}))) as { user?: AuthResponse['user'] };
    if (!res.ok) {
      const { message, code } = messageFromErrorBody(data);
      throw new ApiError(message, res.status, code);
    }
    if (!data.user) {
      throw new ApiError('Invalid refresh response', res.status);
    }
    persistUser(data.user);
    return { user: data.user };
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Still clear local session if the API call fails
    }
    clearUserFromStorage();
  },
};

// Portfolio API
export const portfolioApi = {
  async getValuation(): Promise<PortfolioValuation> {
    const response = await request<ApiSuccessResponse<PortfolioValuation>>('/api/portfolio');
    return response.data;
  },
};

// Trade API
export const tradeApi = {
  async previewTrade(input: Omit<TradePreviewInput, 'userId'>): Promise<TradePreviewResult> {
    const response = await request<ApiSuccessResponse<TradePreviewResult>>('/api/trade/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },
  async executeTrade(input: Omit<ExecuteTradeInput, 'userId'>): Promise<TradeExecutionResult> {
    const response = await request<ApiSuccessResponse<TradeExecutionResult>>('/api/trade', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },
};

export interface TransactionListParams {
  cursor?: string;
  limit?: number;
  type?: TradeSide;
  ticker?: string;
  from?: string;
  to?: string;
}

export const transactionsApi = {
  async list(userId: string, params: TransactionListParams = {}): Promise<PaginatedResponse<TransactionHistoryItem>> {
    const search = new URLSearchParams();
    if (params.cursor) search.set('cursor', params.cursor);
    if (params.limit != null) search.set('limit', String(params.limit));
    if (params.type) search.set('type', params.type);
    if (params.ticker) search.set('ticker', params.ticker.trim());
    if (params.from) search.set('from', params.from);
    if (params.to) search.set('to', params.to);
    const qs = search.toString();
    const path = `/api/transactions/${encodeURIComponent(userId)}${qs ? `?${qs}` : ''}`;
    const response = await request<ApiSuccessResponse<PaginatedResponse<TransactionHistoryItem>>>(path);
    return response.data;
  },
};

export const analyticsApi = {
  async get(userId: string, range: AnalyticsRange = '30d'): Promise<PortfolioAnalyticsPayload> {
    const qs = new URLSearchParams({ range });
    const path = `/api/analytics/${encodeURIComponent(userId)}?${qs.toString()}`;
    const response = await request<ApiSuccessResponse<PortfolioAnalyticsPayload>>(path);
    return response.data;
  },
};

export interface MarketQuote {
  ticker: string;
  price: string | number;
  change?: string | number;
  changePercent?: string | number;
  timestamp: string;
  name?: string;
  previousPrice?: string | number;
  source?: 'live' | 'simulated';
  open?: string;
  high?: string;
  low?: string;
}

export interface DiscoverData {
  trending: MarketQuote[];
  movers: MarketQuote[];
  ipos: MarketQuote[];
}

export interface MarketCandles {
  ticker: string;
  resolution: string;
  bars: {
    time: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }[];
}

export const marketApi = {
  async getFeatures(): Promise<{ marketstackEnabled: boolean }> {
    const response = await request<ApiSuccessResponse<{ marketstackEnabled: boolean }>>(
      '/api/market/features',
    );
    return response.data;
  },
  async getDiscover(): Promise<DiscoverData> {
    const response = await request<ApiSuccessResponse<DiscoverData>>('/api/market/discover');
    return response.data;
  },
  async getQuotesBatch(tickers: string[]): Promise<MarketQuote[]> {
    if (tickers.length === 0) return [];
    const qs = new URLSearchParams({ tickers: tickers.join(',') });
    const response = await request<ApiSuccessResponse<MarketQuote[]>>(
      `/api/market/quotes?${qs.toString()}`,
    );
    return response.data;
  },
  async getQuote(ticker: string): Promise<MarketQuote | null> {
    const response = await request<ApiSuccessResponse<MarketQuote>>(`/api/market/quotes/${ticker}`);
    return response.data;
  },
  async getCandles(
    ticker: string,
    opts?: { resolution?: string; from?: number; to?: number },
  ): Promise<MarketCandles | null> {
    const qs = new URLSearchParams();
    if (opts?.resolution) qs.set('resolution', opts.resolution);
    if (opts?.from != null) qs.set('from', String(opts.from));
    if (opts?.to != null) qs.set('to', String(opts.to));
    const suffix = qs.toString();
    const path = `/api/market/candles/${encodeURIComponent(ticker)}${suffix ? `?${suffix}` : ''}`;
    try {
      const response = await request<ApiSuccessResponse<MarketCandles>>(path);
      return response.data;
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 503) {
        return null;
      }
      throw e;
    }
  },
  async search(q: string): Promise<{ ticker: string; name: string }[]> {
    const qs = new URLSearchParams({ q });
    const response = await request<ApiSuccessResponse<{ ticker: string; name: string }[]>>(
      `/api/market/search?${qs.toString()}`,
    );
    return response.data;
  },
};

export const watchlistApi = {
  async list(): Promise<WatchlistItem[]> {
    const response = await request<ApiSuccessResponse<WatchlistItem[]>>('/api/watchlist');
    return response.data;
  },
  async add(ticker: string): Promise<WatchlistItem> {
    const response = await request<ApiSuccessResponse<WatchlistItem>>('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ ticker }),
    });
    return response.data;
  },
  async remove(ticker: string): Promise<void> {
    await request<void>(`/api/watchlist/${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
    });
  },
};

export const alertsApi = {
  async list(): Promise<PaperAlertsPayload> {
    const response = await request<ApiSuccessResponse<PaperAlertsPayload>>('/api/alerts');
    return response.data;
  },
  async create(input: {
    ticker: string;
    type: PaperAlertType;
    targetPrice?: string;
    percentThreshold?: string;
  }): Promise<PaperAlert> {
    const response = await request<ApiSuccessResponse<PaperAlert>>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },
  async remove(id: string): Promise<void> {
    await request<void>(`/api/alerts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export const settingsApi = {
  async get(): Promise<UserSettings> {
    const response = await request<ApiSuccessResponse<UserSettings>>('/api/settings');
    return response.data;
  },
  async updateStartingBalance(startingBalance: string): Promise<UserSettings> {
    const response = await request<ApiSuccessResponse<UserSettings>>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ startingBalance }),
    });
    return response.data;
  },
  async resetPortfolio(): Promise<UserSettings> {
    const response = await request<ApiSuccessResponse<UserSettings>>('/api/settings/reset-portfolio', {
      method: 'POST',
    });
    return response.data;
  },
};

export { ApiError };
export type {
  TradePreviewInput,
  TradePreviewResult,
  PaperAlert,
  PaperAlertType,
  PaperAlertsPayload,
} from '@paperxent/shared-types';
