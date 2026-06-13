import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error.js';
import { TradesRepository } from './trades.repository.js';
import { MarketRepository } from '../market/market.repository.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PortfoliosRepository } from '../portfolios/portfolios.repository.js';
import { MARKET_METADATA } from '../market/market-metadata.js';
import type { 
  ExecuteTradeInput, 
  NormalizedTradeInput, 
  TradeExecutionResult,
  TradePreviewInput,
  TradePreviewResult
} from './trades.types.js';

const TICKER_PATTERN = /^[A-Z][A-Z0-9.]{0,15}$/;
const MAX_QUOTE_AGE_MS = 15_000;

export class TradesService {
  constructor(
    private readonly tradesRepository = new TradesRepository(),
    private readonly marketRepository = new MarketRepository(),
    private readonly authRepository = new AuthRepository(),
    private readonly portfoliosRepository = new PortfoliosRepository(),
  ) {}

  async previewTrade(input: TradePreviewInput): Promise<TradePreviewResult> {
    const ticker = input.ticker.trim().toUpperCase();
    this.validateTicker(ticker);

    const quote = await this.marketRepository.findQuote({ ticker });
    if (!quote) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: `No market quote available for ${ticker}.`,
        statusCode: 404,
      });
    }

    const quoteTime = new Date(quote.timestamp).getTime();
    const age = Date.now() - quoteTime;
    const isQuoteStale = age > MAX_QUOTE_AGE_MS;

    const user = await this.authRepository.findById(input.userId);
    if (!user) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'User not found.',
        statusCode: 404,
      });
    }

    const position = await this.portfoliosRepository.findPosition(input.userId, ticker);
    const currentHoldings = position?.quantity || '0';

    const price = new Prisma.Decimal(quote.price);
    let estimatedQuantity: Prisma.Decimal;
    let estimatedNotional: Prisma.Decimal;

    if (input.quantity) {
      estimatedQuantity = new Prisma.Decimal(input.quantity);
      estimatedNotional = estimatedQuantity.mul(price);
    } else if (input.notional) {
      estimatedNotional = new Prisma.Decimal(input.notional);
      estimatedQuantity = estimatedNotional.div(price);
    } else {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Either quantity or notional must be provided.',
        statusCode: 400,
      });
    }

    const insufficientFunds = input.side === 'BUY' && new Prisma.Decimal(user.balance).lt(estimatedNotional);
    const insufficientHoldings = input.side === 'SELL' && new Prisma.Decimal(currentHoldings).lt(estimatedQuantity);

    return {
      side: input.side,
      ticker,
      quotePrice: quote.price,
      quoteTimestamp: quote.timestamp,
      isQuoteStale,
      requestedQuantity: input.quantity,
      requestedNotional: input.notional,
      estimatedQuantity: estimatedQuantity.toFixed(4),
      estimatedNotional: estimatedNotional.toFixed(2),
      userBalance: user.balance.toString(),
      currentHoldings,
      insufficientFunds,
      insufficientHoldings,
      canExecute: !isQuoteStale && !insufficientFunds && !insufficientHoldings,
    };
  }

  async executeTrade(input: ExecuteTradeInput): Promise<TradeExecutionResult> {
    const ticker = input.ticker.trim().toUpperCase();
    this.validateTicker(ticker);

    const quote = await this.marketRepository.findQuote({ ticker });
    if (!quote) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: `No market quote available for ${ticker}.`,
        statusCode: 404,
      });
    }

    const quoteTime = new Date(quote.timestamp).getTime();
    if (Date.now() - quoteTime > MAX_QUOTE_AGE_MS) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'The market quote is stale. Please refresh and try again.',
        statusCode: 400,
      });
    }

    const price = new Prisma.Decimal(quote.price);
    let quantity: Prisma.Decimal;

    if (input.quantity) {
      quantity = new Prisma.Decimal(input.quantity);
    } else if (input.notional) {
      quantity = new Prisma.Decimal(input.notional).div(price);
    } else {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Either quantity or notional must be provided.',
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

    const normalizedInput: NormalizedTradeInput = {
      userId: input.userId,
      side: input.side,
      ticker,
      quantity: quantity.toFixed(4),
      price: price.toFixed(4),
    };

    return this.tradesRepository.executeTrade(normalizedInput);
  }

  private validateTicker(ticker: string) {
    if (!TICKER_PATTERN.test(ticker)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Ticker must be 1-16 uppercase letters, numbers, or periods.',
        statusCode: 400,
      });
    }

    const isSupported = MARKET_METADATA.some((m) => m.ticker === ticker);
    if (!isSupported) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: `Ticker ${ticker} is not supported for paper trading.`,
        statusCode: 400,
      });
    }
  }
}
