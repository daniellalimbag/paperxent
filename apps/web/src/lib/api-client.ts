import type {
  ApiSuccessResponse,
  PortfolioValuation,
  ExecuteTradeInput,
  TradeExecutionResult,
  AuthResponse,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  PaginatedResponse,
  TransactionHistoryItem,
  TradeSide,
} from '@paperxent/shared-types';

import { getPublicApiUrl } from '@/lib/public-env';

const API_BASE_URL = getPublicApiUrl();

/** Cookie name must match apps/web/src/middleware.ts */
const ACCESS_TOKEN_COOKIE = 'accessToken';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days; aligns with typical refresh window

function persistAuthSession(response: AuthResponse): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', response.tokens.accessToken);
  localStorage.setItem('refreshToken', response.tokens.refreshToken);
  localStorage.setItem('user', JSON.stringify(response.user));
  // Mirror for Next.js middleware (same XSS profile as localStorage; prefer httpOnly API route later)
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${response.tokens.accessToken}; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; SameSite=Lax`;
}

function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
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
    return { message: 'Request failed' };
  }
  const err = (body as Record<string, unknown>).error;
  if (typeof err === 'string') {
    return { message: err };
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') {
      const code = (err as { code?: unknown }).code;
      return {
        message: msg,
        code: typeof code === 'string' ? code : undefined,
      };
    }
  }
  return { message: 'Request failed' };
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (e) {
    const hint = `Cannot reach API at ${API_BASE_URL}. Start Docker (Postgres + Redis) and the API, or set NEXT_PUBLIC_API_URL.`;
    const message = e instanceof TypeError ? hint : e instanceof Error ? e.message : 'Network error';
    throw new ApiError(message, 0, 'NETWORK');
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const { message, code } = messageFromErrorBody(body);
    throw new ApiError(message, response.status, code);
  }

  return response.json() as Promise<T>;
}

// Auth API
export const authApi = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    try {
      persistAuthSession(response);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      throw new ApiError(
        `Could not save session in the browser (${msg}). Check that cookies and storage are allowed for this site.`,
        0,
        'SESSION_PERSIST'
      );
    }
    return response;
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    try {
      persistAuthSession(response);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      throw new ApiError(
        `Could not save session in the browser (${msg}). Check that cookies and storage are allowed for this site.`,
        0,
        'SESSION_PERSIST'
      );
    }
    return response;
  },

  async refresh(input: RefreshTokenInput): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    try {
      persistAuthSession(response);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      throw new ApiError(
        `Could not save session in the browser (${msg}). Check that cookies and storage are allowed for this site.`,
        0,
        'SESSION_PERSIST'
      );
    }
    return response;
  },

  async logout(): Promise<void> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

    if (refreshToken) {
      try {
        await request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Still clear local session if the API call fails
      }
    }

    clearAuthSession();
  },

  getAccessToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  },

  getRefreshToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
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

export { ApiError };
