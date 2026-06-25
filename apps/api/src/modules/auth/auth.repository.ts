import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@paperxent/database';
import { AppError } from '../../shared/errors/app-error.js';
import type { RegisterInput, LoginInput, RefreshTokenData } from './auth.types.js';
import { DEFAULT_STARTING_BALANCE } from '../../config/paper-trading.js';

export class AuthRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Find a user by email
   */
  async findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find a user by ID
   */
  async findById(id: string) {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new user
   */
  async create(input: RegisterInput, hashedPassword: string) {
    try {
      return await this.db.user.create({
        data: {
          email: input.email,
          passwordHash: hashedPassword,
          balance: DEFAULT_STARTING_BALANCE,
          startingBalance: DEFAULT_STARTING_BALANCE,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError({
            code: 'BAD_REQUEST',
            message: 'Email already exists',
            statusCode: 409,
          });
        }
      }
      throw error;
    }
  }

  /**
   * Store a refresh token in Redis
   */
  async storeRefreshToken(refreshTokenData: RefreshTokenData): Promise<void> {
    const { redis } = await import('../../shared/cache/redis.js');
    const key = `refresh_token:${refreshTokenData.token}`;
    const ttl = 7 * 24 * 60 * 60; // 7 days in seconds

    await redis.set(key, JSON.stringify(refreshTokenData), 'EX', ttl);
  }

  /**
   * Get refresh token data from Redis
   */
  async getRefreshToken(token: string): Promise<RefreshTokenData | null> {
    const { redis } = await import('../../shared/cache/redis.js');
    const key = `refresh_token:${token}`;
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as RefreshTokenData;
  }

  /**
   * Delete a refresh token from Redis
   */
  async deleteRefreshToken(token: string): Promise<void> {
    const { redis } = await import('../../shared/cache/redis.js');
    const key = `refresh_token:${token}`;
    await redis.del(key);
  }

  /**
   * Delete all refresh tokens for a user
   */
  async deleteUserRefreshTokens(userId: string): Promise<void> {
    const { redis } = await import('../../shared/cache/redis.js');
    const pattern = `refresh_token:*`;
    const keys = await redis.keys(pattern);

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const tokenData = JSON.parse(data) as RefreshTokenData;
        if (tokenData.userId === userId) {
          await redis.del(key);
        }
      }
    }
  }

  /**
   * Verify user credentials
   */
  async verifyCredentials(input: LoginInput) {
    const user = await this.findByEmail(input.email);

    if (!user) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
        statusCode: 401,
      });
    }

    return user;
  }
}
