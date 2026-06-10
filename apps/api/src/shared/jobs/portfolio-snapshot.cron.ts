import { schedule } from 'node-cron';
import { Prisma } from '@prisma/client';
import { AnalyticsRepository } from '../../modules/analytics/analytics.repository.js';
import { PortfoliosService } from '../../modules/portfolios/portfolios.service.js';
import { logger } from '../logging/logger.js';

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Daily job: persist total account value (cash + securities) per user for analytics charts.
 * Runs at 00:00 UTC. Idempotent per (userId, snapshotDate) via upsert.
 */
export function schedulePortfolioSnapshotCron(): () => void {
  const repo = new AnalyticsRepository();
  const portfolios = new PortfoliosService();

  const run = async () => {
    logger.info('[Snapshot] daily portfolio snapshot job started');
    const userIds = await repo.listAllUserIds();
    const snapshotDate = utcDateOnly(new Date());

    for (const userId of userIds) {
      try {
        const balance = await repo.getUserBalance(userId);
        if (balance === null) continue;

        let securities = new Prisma.Decimal(0);
        try {
          const v = await portfolios.getValuation({ userId });
          securities = new Prisma.Decimal(v.totalPortfolioValue);
        } catch {
          // Quotes unavailable — snapshot cash-only + zero securities
        }

        const total = balance.plus(securities);
        await repo.upsertDailySnapshot(userId, snapshotDate, total);
      } catch (error) {
        logger.error('[Snapshot] failed for user', { userId, error });
      }
    }

    logger.info('[Snapshot] daily portfolio snapshot job finished', { users: userIds.length });
  };

  const task = schedule(
    '0 0 * * *',
    () => {
      void run();
    },
    { timezone: 'UTC' },
  );

  return () => {
    task.stop();
  };
}
