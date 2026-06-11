import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors/app-error.js';
import type { AuthPayload, TokenPair, JwtPayload } from './auth.types.js';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate an access token
   */
  generateAccessToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate a refresh token
   */
  generateRefreshToken(): string {
    return randomUUID();
  }

  /**
   * Generate a token pair
   */
  generateTokenPair(payload: AuthPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(),
    };
  }

  /**
   * Verify an access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        statusCode: 401,
      });
    }
  }

  /**
   * Get refresh token expiry date
   */
  getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days
    return expiry;
  }
}
