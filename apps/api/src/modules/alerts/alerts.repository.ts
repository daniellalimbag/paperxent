import type { PaperAlertType, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@paperxent/database';

export class AlertsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listByUserId(userId: string) {
    return this.db.paperAlert.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.db.paperAlert.count({ where: { userId, isActive: true } });
  }

  async findActiveByTicker(ticker: string) {
    return this.db.paperAlert.findMany({
      where: { ticker, isActive: true },
    });
  }

  async findActiveByUserId(userId: string) {
    return this.db.paperAlert.findMany({
      where: { userId, isActive: true },
    });
  }

  async create(data: {
    userId: string;
    ticker: string;
    type: PaperAlertType;
    targetPrice: Prisma.Decimal | null;
    percentThreshold: Prisma.Decimal | null;
    baselinePrice: Prisma.Decimal;
  }) {
    return this.db.paperAlert.create({ data });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    try {
      await this.db.paperAlert.delete({ where: { id, userId } });
      return true;
    } catch {
      return false;
    }
  }

  async trigger(id: string, triggeredPrice: Prisma.Decimal) {
    return this.db.paperAlert.update({
      where: { id },
      data: {
        isActive: false,
        triggeredAt: new Date(),
        triggeredPrice,
      },
    });
  }
}
