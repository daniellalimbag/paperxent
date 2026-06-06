import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error.js';
import { TradesRepository } from './trades.repository.js';
import type { ExecuteTradeInput, NormalizedTradeInput, TradeExecutionResult } from './trades.types.js';

const TICKER_PATTERN = /^[A-Z][A-Z0-9.]{0,15}$/;

export class TradesService {
  constructor(private readonly tradesRepository = new TradesRepository()) {}

  executeTrade(input: ExecuteTradeInput): Promise<TradeExecutionResult> {
    const normalizedInput = this.normalizeAndValidateInput(input);

    return this.tradesRepository.executeTrade(normalizedInput);
  }

  private normalizeAndValidateInput(input: ExecuteTradeInput): NormalizedTradeInput {
    const ticker = input.ticker.trim().toUpperCase();
    const quantity = new Prisma.Decimal(input.quantity);
    const price = new Prisma.Decimal(input.price);

    if (!TICKER_PATTERN.test(ticker)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Ticker must be 1-16 uppercase letters, numbers, or periods.',
        statusCode: 400,
      });
    }

    if (!quantity.isFinite() || quantity.lte(0)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Trade quantity must be greater than zero.',
        statusCode: 400,
      });
    }

    if (!price.isFinite() || price.lte(0)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Trade price must be greater than zero.',
        statusCode: 400,
      });
    }

    return {
      userId: input.userId,
      side: input.side,
      ticker,
      quantity: quantity.toString(),
      price: price.toString(),
    };
  }
}
