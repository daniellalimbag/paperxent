import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  PortfolioValuation,
  ExecuteTradeInput,
  TradeExecutionResult,
  AuthResponse,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
} from '@paperxent/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    public message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(errorData.error, response.status, errorData.code);
  }

  return response.json();
}

// Auth API
export const authApi = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    persistAuthSession(response);
    return response;
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    persistAuthSession(response);
    return response;
  },

  async refresh(input: RefreshTokenInput): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    persistAuthSession(response);
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

export { ApiError };
