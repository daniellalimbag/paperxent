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
  TokenPair,
} from '@paperxent/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    // Store tokens in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', response.tokens.accessToken);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);
    }

    return response;
  },

  async refresh(input: RefreshTokenInput): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    // Update tokens in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', response.tokens.accessToken);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);
    }

    return response;
  },

  async logout(): Promise<void> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

    if (refreshToken) {
      await request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }

    // Clear tokens from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
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
