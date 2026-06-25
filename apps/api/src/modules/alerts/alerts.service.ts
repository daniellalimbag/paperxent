import { Prisma } from '@prisma/client';
import type { PaperAlertType } from '@paperxent/shared-types';
import { AppError } from '../../shared/errors/app-error.js';
import { MarketService } from '../market/market.service.js';
import { AlertsRepository } from './alerts.repository.js';
import type { CreatePaperAlertInput, PaperAlertRow, PaperAlertsPayload } from './alerts.types.js';

const TICKER_PATTERN = /^[A-Z][A-Z0-9.]{0,15}$/;
const MAX_ACTIVE_ALERTS = 50;
const TRIGGERED_RETENTION_DAYS = 30;

function rowToDto(row: {
  id: string;
  ticker: string;
  type: PaperAlertType;
  targetPrice: Prisma.Decimal | null;
  percentThreshold: Prisma.Decimal | null;
  baselinePrice: Prisma.Decimal;
  isActive: boolean;
  triggeredAt: Date | null;
  triggeredPrice: Prisma.Decimal | null;
  createdAt: Date;
}): PaperAlertRow {
  return {
    id: row.id,
    ticker: row.ticker,
    type: row.type,
    targetPrice: row.targetPrice?.toString() ?? null,
    percentThreshold: row.percentThreshold?.toString() ?? null,
    baselinePrice: row.baselinePrice.toString(),
    isActive: row.isActive,
    triggeredAt: row.triggeredAt?.toISOString() ?? null,
    triggeredPrice: row.triggeredPrice?.toString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class AlertsService {
  constructor(
    private readonly repo = new AlertsRepository(),
    private readonly marketService = new MarketService(),
  ) {}

  async listForUser(userId: string): Promise<PaperAlertsPayload> {
    await this.evaluateActiveForUser(userId);
    const rows = await this.repo.listByUserId(userId);
    const cutoff = Date.now() - TRIGGERED_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const active: PaperAlertRow[] = [];
    const triggered: PaperAlertRow[] = [];

    for (const row of rows) {
      const dto = rowToDto(row);
      if (row.isActive) {
        active.push(dto);
      } else if (row.triggeredAt && row.triggeredAt.getTime() >= cutoff) {
        triggered.push(dto);
      }
    }

    return { active, triggered };
  }

  async create(input: CreatePaperAlertInput): Promise<PaperAlertRow> {
    const ticker = input.ticker.trim().toUpperCase();
    if (!TICKER_PATTERN.test(ticker)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Ticker must be 1–16 uppercase letters, numbers, or periods.',
        statusCode: 400,
      });
    }

    const quote = await this.marketService.getQuote({ ticker });
    if (!quote) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: `No market quote available for ${ticker}.`,
        statusCode: 404,
      });
    }

    const baseline = new Prisma.Decimal(quote.price);
    if (!baseline.isFinite() || baseline.lte(0)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Cannot create alert without a valid baseline price.',
        statusCode: 400,
      });
    }

    let targetPrice: Prisma.Decimal | null = null;
    let percentThreshold: Prisma.Decimal | null = null;

    if (input.type === 'PRICE_ABOVE' || input.type === 'PRICE_BELOW') {
      if (!input.targetPrice) {
        throw new AppError({
          code: 'BAD_REQUEST',
          message: 'targetPrice is required for price alerts.',
          statusCode: 400,
        });
      }
      targetPrice = new Prisma.Decimal(input.targetPrice);
      if (!targetPrice.isFinite() || targetPrice.lte(0)) {
        throw new AppError({
          code: 'BAD_REQUEST',
          message: 'targetPrice must be a positive number.',
          statusCode: 400,
        });
      }
    } else {
      if (!input.percentThreshold) {
        throw new AppError({
          code: 'BAD_REQUEST',
          message: 'percentThreshold is required for percent-move alerts.',
          statusCode: 400,
        });
      }
      const pct = new Prisma.Decimal(input.percentThreshold);
      if (!pct.isFinite() || pct.lte(0) || pct.gt(100)) {
        throw new AppError({
          code: 'BAD_REQUEST',
          message: 'percentThreshold must be between 0 and 100.',
          statusCode: 400,
        });
      }
      percentThreshold = pct.div(100);
    }

    const activeCount = await this.repo.countActiveByUserId(input.userId);
    if (activeCount >= MAX_ACTIVE_ALERTS) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: `You can have at most ${MAX_ACTIVE_ALERTS} active alerts.`,
        statusCode: 400,
      });
    }

    const row = await this.repo.create({
      userId: input.userId,
      ticker,
      type: input.type,
      targetPrice,
      percentThreshold,
      baselinePrice: baseline,
    });

    return rowToDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const ok = await this.repo.delete(userId, id);
    if (!ok) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'Alert not found.',
        statusCode: 404,
      });
    }
  }

  async evaluateForTicker(ticker: string, priceStr: string): Promise<void> {
    const sym = ticker.trim().toUpperCase();
    const price = new Prisma.Decimal(priceStr);
    if (!price.isFinite() || price.lte(0)) return;

    const alerts = await this.repo.findActiveByTicker(sym);
    for (const alert of alerts) {
      if (this.shouldTrigger(alert, price)) {
        await this.repo.trigger(alert.id, price);
      }
    }
  }

  private async evaluateActiveForUser(userId: string): Promise<void> {
    const alerts = await this.repo.findActiveByUserId(userId);
    if (alerts.length === 0) return;

    const tickers = [...new Set(alerts.map((a) => a.ticker))];
    const quotes = await this.marketService.getQuotes(tickers);
    const byTicker = new Map(quotes.map((q) => [q.ticker, q]));

    for (const alert of alerts) {
      const quote = byTicker.get(alert.ticker);
      if (!quote) continue;
      const price = new Prisma.Decimal(quote.price);
      if (this.shouldTrigger(alert, price)) {
        await this.repo.trigger(alert.id, price);
      }
    }
  }

  private shouldTrigger(
    alert: {
      type: PaperAlertType;
      targetPrice: Prisma.Decimal | null;
      percentThreshold: Prisma.Decimal | null;
      baselinePrice: Prisma.Decimal;
    },
    price: Prisma.Decimal,
  ): boolean {
    switch (alert.type) {
      case 'PRICE_ABOVE':
        return alert.targetPrice != null && price.gte(alert.targetPrice);
      case 'PRICE_BELOW':
        return alert.targetPrice != null && price.lte(alert.targetPrice);
      case 'PERCENT_UP': {
        if (!alert.percentThreshold || alert.baselinePrice.isZero()) return false;
        const change = price.minus(alert.baselinePrice).div(alert.baselinePrice);
        return change.gte(alert.percentThreshold);
      }
      case 'PERCENT_DOWN': {
        if (!alert.percentThreshold || alert.baselinePrice.isZero()) return false;
        const change = alert.baselinePrice.minus(price).div(alert.baselinePrice);
        return change.gte(alert.percentThreshold);
      }
      default:
        return false;
    }
  }
}
