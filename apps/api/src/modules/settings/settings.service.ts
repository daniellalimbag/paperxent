import { Prisma } from '@prisma/client';
import type { UserSettings } from '@paperxent/shared-types';
import { AppError } from '../../shared/errors/app-error.js';
import { SettingsRepository } from './settings.repository.js';
const MIN_STARTING_BALANCE = new Prisma.Decimal('1000');
const MAX_STARTING_BALANCE = new Prisma.Decimal('10000000');

function toDto(row: {
  id: string;
  email: string;
  balance: Prisma.Decimal;
  startingBalance: Prisma.Decimal;
  createdAt: Date;
}): UserSettings {
  return {
    id: row.id,
    email: row.email,
    balance: row.balance.toString(),
    startingBalance: row.startingBalance.toString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function parseStartingBalance(value: string): Prisma.Decimal {
  const amount = new Prisma.Decimal(value.trim());
  if (!amount.isFinite() || amount.lte(0)) {
    throw new AppError({
      code: 'BAD_REQUEST',
      message: 'Starting balance must be a positive number.',
      statusCode: 400,
    });
  }
  if (amount.lt(MIN_STARTING_BALANCE)) {
    throw new AppError({
      code: 'BAD_REQUEST',
      message: `Starting balance must be at least $${MIN_STARTING_BALANCE.toString()}.`,
      statusCode: 400,
    });
  }
  if (amount.gt(MAX_STARTING_BALANCE)) {
    throw new AppError({
      code: 'BAD_REQUEST',
      message: `Starting balance cannot exceed $${MAX_STARTING_BALANCE.toString()}.`,
      statusCode: 400,
    });
  }
  return amount;
}

export class SettingsService {
  constructor(private readonly repo = new SettingsRepository()) {}

  async getForUser(userId: string): Promise<UserSettings> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'User not found.',
        statusCode: 404,
      });
    }
    return toDto(user);
  }

  async updateStartingBalance(userId: string, startingBalance: string): Promise<UserSettings> {
    const amount = parseStartingBalance(startingBalance);
    const user = await this.repo.updateStartingBalance(userId, amount);
    return toDto(user);
  }

  async resetPortfolio(userId: string): Promise<UserSettings> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'User not found.',
        statusCode: 404,
      });
    }
    const reset = await this.repo.resetPortfolio(userId, user.startingBalance);
    return toDto(reset);
  }
}
