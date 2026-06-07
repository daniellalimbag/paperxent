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

export interface JwtPayload extends AuthPayload {
  iat: number;
  exp: number;
}

export interface RefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
}
