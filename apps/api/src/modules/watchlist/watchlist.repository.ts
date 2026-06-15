import type { PrismaClient } from '@prisma/client';
import { prisma } from '@paperxent/database';

export class WatchlistRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listByUserId(userId: string) {
    return this.db.watchlistEntry.findMany({
      where: { userId },
      select: { ticker: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.db.watchlistEntry.count({ where: { userId } });
  }

  async exists(userId: string, ticker: string): Promise<boolean> {
    const row = await this.db.watchlistEntry.findUnique({
      where: { userId_ticker: { userId, ticker } },
      select: { id: true },
    });
    return row != null;
  }

  async create(userId: string, ticker: string) {
    return this.db.watchlistEntry.create({
      data: { userId, ticker },
      select: { ticker: true, createdAt: true },
    });
  }

  async delete(userId: string, ticker: string): Promise<boolean> {
    try {
      await this.db.watchlistEntry.delete({
        where: { userId_ticker: { userId, ticker } },
      });
      return true;
    } catch {
      return false;
    }
  }
}
