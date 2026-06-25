import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@paperxent/database';

export class SettingsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findUserById(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        balance: true,
        startingBalance: true,
        createdAt: true,
      },
    });
  }

  async updateStartingBalance(userId: string, startingBalance: Prisma.Decimal) {
    return this.db.user.update({
      where: { id: userId },
      data: { startingBalance },
      select: {
        id: true,
        email: true,
        balance: true,
        startingBalance: true,
        createdAt: true,
      },
    });
  }

  async resetPortfolio(userId: string, startingBalance: Prisma.Decimal) {
    return this.db.$transaction(async (tx) => {
      await tx.portfolio.deleteMany({ where: { userId } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.portfolioSnapshot.deleteMany({ where: { userId } });

      return tx.user.update({
        where: { id: userId },
        data: { balance: startingBalance },
        select: {
          id: true,
          email: true,
          balance: true,
          startingBalance: true,
          createdAt: true,
        },
      });
    });
  }
}
