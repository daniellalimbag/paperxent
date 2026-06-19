import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error.js';
import { TradesRepository } from './trades.repository.js';
import { MarketService } from '../market/market.service.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { PortfoliosRepository } from '../portfolios/portfolios.repository.js';
import { MARKET_METADATA } from '../market/market-metadata.js';
import { isMarketstackEnabled } from '../market/marketstack.service.js';
import type {
  ExecuteTradeInput,
  NormalizedTradeInput,
  TradeExecutionResult,
  TradePreviewInput,
  TradePreviewResult,
} from './trades.types.js';
import { TradeAnalysisService } from './trade-analysis.service.js';

const TICKER_PATTERN = /^[A-Z][A-Z0-9.]{0,15}$/;
/** Simulated feed ticks every second; live quotes can lag minutes between trades. */
const QUOTE_STALE_SIM_MS = 15_000;
const QUOTE_STALE_LIVE_MS = Number(process.env.QUOTE_MAX_AGE_MS ?? 300_000);
/** Notional → share math can overshoot holdings by a tiny amount; clamp instead of failing sells. */
const SELL_QUANTITY_DUST = new Prisma.Decimal('0.0001');

function maxQuoteAgeMs(): number {
  return isMarketstackEnabled() ? QUOTE_STALE_LIVE_MS : QUOTE_STALE_SIM_MS;
}

function isTickerAllowedForTrading(ticker: string): boolean {
  if (isMarketstackEnabled()) {
    return /^[A-Z]{1,7}(\.[A-Z]{1,2})?$/.test(ticker);
  }
  return MARKET_METADATA.some((m) => m.ticker === ticker);
}

export class TradesService {
  constructor(
    private readonly tradesRepository = new TradesRepository(),
    private readonly marketService = new MarketService(),
    private readonly authRepository = new AuthRepository(),
    private readonly portfoliosRepository = new PortfoliosRepository(),
    private readonly tradeAnalysisService = new TradeAnalysisService(),
  ) {}

  async previewTrade(input: TradePreviewInput): Promise<TradePreviewResult> {
    const ticker = input.ticker.trim().toUpperCase();
    this.validateTicker(ticker);

    const quote = await this.marketService.getQuote({ ticker });
    if (!quote) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: `No market quote available for ${ticker}.`,
        statusCode: 404,
      });
    }

    const quoteTime = new Date(quote.timestamp).getTime();
    const age = Date.now() - quoteTime;
    const isQuoteStale = age > maxQuoteAgeMs();

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
    const holdingsDec = new Prisma.Decimal(currentHoldings);

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

    let sellQtyForChecks = estimatedQuantity;
    if (input.side === 'SELL' && estimatedQuantity.gt(holdingsDec)) {
      const over = estimatedQuantity.sub(holdingsDec);
      if (over.lte(SELL_QUANTITY_DUST)) {
        sellQtyForChecks = holdingsDec;
      }
    }

    const insufficientFunds =
      input.side === 'BUY' && new Prisma.Decimal(user.balance).lt(estimatedNotional);
    const insufficientHoldings =
      input.side === 'SELL' && holdingsDec.lt(sellQtyForChecks);

    const result: TradePreviewResult = {
      side: input.side,
      ticker,
      quotePrice: quote.price,
      quoteTimestamp: quote.timestamp,
      isQuoteStale,
      estimatedQuantity: estimatedQuantity.toFixed(4),
      estimatedNotional: estimatedNotional.toFixed(2),
      userBalance: user.balance.toString(),
      currentHoldings,
      insufficientFunds,
      insufficientHoldings,
      canExecute: !isQuoteStale && !insufficientFunds && !insufficientHoldings,
    };
    if (input.quantity !== undefined) {
      result.requestedQuantity = input.quantity;
    }
    if (input.notional !== undefined) {
      result.requestedNotional = input.notional;
    }
    return result;
  }

  async executeTrade(input: ExecuteTradeInput): Promise<TradeExecutionResult> {
    const ticker = input.ticker.trim().toUpperCase();
    this.validateTicker(ticker);

    const quote = await this.marketService.getQuote({ ticker });
    if (!quote) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: `No market quote available for ${ticker}.`,
        statusCode: 404,
      });
    }

    const quoteTime = new Date(quote.timestamp).getTime();
    if (Date.now() - quoteTime > maxQuoteAgeMs()) {
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

    if (input.side === 'SELL') {
      const position = await this.portfoliosRepository.findPosition(input.userId, ticker);
      const holdings = new Prisma.Decimal(position?.quantity ?? '0');
      if (quantity.gt(holdings)) {
        const over = quantity.sub(holdings);
        if (over.lte(SELL_QUANTITY_DUST)) {
          quantity = holdings;
        } else {
          throw new AppError({
            code: 'INSUFFICIENT_HOLDINGS',
            message: 'Portfolio holdings are too low for this sell order.',
            statusCode: 409,
          });
        }
      }
    }

    const normalizedInput: NormalizedTradeInput = {
      userId: input.userId,
      side: input.side,
      ticker,
      quantity: quantity.toFixed(4),
      price: price.toFixed(4),
    };

    const result = await this.tradesRepository.executeTrade(normalizedInput);

    try {
      const analysis = await this.tradeAnalysisService.analyzeTrade({
        userId: input.userId,
        side: result.side,
        ticker: result.ticker,
        quantity: result.quantity,
        price: result.price,
        userBalance: result.userBalance,
        portfolioQuantity: result.portfolioQuantity,
        averageBuyPrice: result.averageBuyPrice,
      });
      return { ...result, analysis };
    } catch {
      return result;
    }
  }

  private validateTicker(ticker: string) {
    if (!TICKER_PATTERN.test(ticker)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Ticker must be 1-16 uppercase letters, numbers, or periods.',
        statusCode: 400,
      });
    }

    if (!isTickerAllowedForTrading(ticker)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: isMarketstackEnabled()
          ? `Ticker ${ticker} is not a supported format for trading.`
          : `Ticker ${ticker} is not supported for paper trading.`,
        statusCode: 400,
      });
    }
  }
}
