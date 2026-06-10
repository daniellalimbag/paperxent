import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error.js';
import type {
  AllocationSlice,
  AnalyticsRange,
  PerAssetRoiPoint,
  PortfolioAnalyticsPayload,
  ValueOverTimePoint,
} from '@paperxent/shared-types';
import { PortfoliosService } from '../portfolios/portfolios.service.js';
import { AnalyticsRepository } from './analytics.repository.js';
import type { ListAnalyticsParams } from './analytics.types.js';

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function rangeStartDate(range: AnalyticsRange, now: Date): Date {
  const today = utcDateOnly(now);
  if (range === '7d') return addUtcDays(today, -7);
  if (range === '30d') return addUtcDays(today, -30);
  return new Date(Date.UTC(2000, 0, 1));
}

export class AnalyticsService {
  constructor(
    private readonly repository = new AnalyticsRepository(),
    private readonly portfoliosService = new PortfoliosService(),
  ) {}

  async getAnalytics(params: ListAnalyticsParams): Promise<PortfolioAnalyticsPayload> {
    if (params.requesterUserId !== params.pathUserId) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'You can only view your own analytics.',
        statusCode: 403,
      });
    }

    const now = new Date();
    const today = utcDateOnly(now);
    const from = rangeStartDate(params.range, now);
    const rows = await this.repository.findSnapshotsBetween(params.pathUserId, from, today);

    const fromSnapshots: ValueOverTimePoint[] = rows.map((r) => ({
      date: r.snapshotDate.toISOString().slice(0, 10),
      total_account_value: r.totalAccountValue.toString(),
    }));

    let valuation;
    try {
      valuation = await this.portfoliosService.getValuation({ userId: params.pathUserId });
    } catch {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'Unable to load live portfolio valuation for analytics.',
        statusCode: 404,
      });
    }

    const balance = await this.repository.getUserBalance(params.pathUserId);
    if (balance === null) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'User not found.',
        statusCode: 404,
      });
    }

    const cash = balance;
    const securities = new Prisma.Decimal(valuation.totalPortfolioValue);
    const liveTotal = cash.plus(securities).toString();
    const todayIso = today.toISOString().slice(0, 10);

    const withoutTodayDup = fromSnapshots.filter((p) => p.date !== todayIso);
    const value_over_time: ValueOverTimePoint[] = [
      ...withoutTodayDup,
      {
        date: todayIso,
        total_account_value: liveTotal,
        is_live: true,
      },
    ];

    const totalForAlloc = cash.plus(securities);
    const allocation: AllocationSlice[] = [];

    if (totalForAlloc.isZero()) {
      allocation.push({
        ticker: 'Cash',
        market_value: '0',
        percent: '100',
      });
    } else {
      if (cash.gt(0)) {
        allocation.push({
          ticker: 'Cash',
          market_value: cash.toString(),
          percent: cash.div(totalForAlloc).mul(100).toString(),
        });
      }
      for (const a of valuation.assets) {
        const mv = new Prisma.Decimal(a.marketValue);
        if (mv.isZero()) continue;
        allocation.push({
          ticker: a.ticker,
          market_value: mv.toString(),
          percent: mv.div(totalForAlloc).mul(100).toString(),
        });
      }
    }

    const per_asset_roi: PerAssetRoiPoint[] = valuation.assets.map((a) => ({
      ticker: a.ticker,
      roi: a.roi,
      unrealized_pnl: a.unrealizedPnl,
    }));

    return {
      range: params.range,
      value_over_time,
      allocation,
      per_asset_roi,
      valued_at: valuation.valuedAt,
    };
  }
}
