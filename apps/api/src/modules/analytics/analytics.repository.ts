import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@paperxent/database';

export class AnalyticsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findSnapshotsBetween(userId: string, from: Date, to: Date) {
    return this.db.portfolioSnapshot.findMany({
      where: {
        userId,
        snapshotDate: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { snapshotDate: 'asc' },
      select: {
        snapshotDate: true,
        totalAccountValue: true,
      },
    });
  }

  async upsertDailySnapshot(userId: string, snapshotDate: Date, totalAccountValue: Prisma.Decimal) {
    await this.db.portfolioSnapshot.upsert({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate,
        },
      },
      create: {
        userId,
        snapshotDate,
        totalAccountValue,
      },
      update: {
        totalAccountValue,
      },
    });
  }

  async listAllUserIds(): Promise<string[]> {
    const rows = await this.db.user.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  }

  async getUserBalance(userId: string): Promise<Prisma.Decimal | null> {
    const u = await this.db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    return u?.balance ?? null;
  }
}
