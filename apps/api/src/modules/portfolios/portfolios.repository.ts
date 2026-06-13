import type { PrismaClient } from '@prisma/client';
import { prisma } from '@paperxent/database';
import type { GetPortfolioInput, PortfolioPosition } from './portfolios.types.js';

export class PortfoliosRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findByUserId(input: GetPortfolioInput): Promise<PortfolioPosition[]> {
    const positions = await this.db.portfolio.findMany({
      where: {
        userId: input.userId,
      },
      select: {
        ticker: true,
        quantity: true,
        averageBuyPrice: true,
      },
      orderBy: {
        ticker: 'asc',
      },
    });

    return positions.map((position) => ({
      ticker: position.ticker,
      quantity: position.quantity.toString(),
      averageBuyPrice: position.averageBuyPrice.toString(),
    }));
  }

  async findPosition(userId: string, ticker: string): Promise<PortfolioPosition | null> {
    const position = await this.db.portfolio.findUnique({
      where: {
        userId_ticker: {
          userId,
          ticker: ticker.trim().toUpperCase(),
        },
      },
    });

    if (!position) return null;

    return {
      ticker: position.ticker,
      quantity: position.quantity.toString(),
      averageBuyPrice: position.averageBuyPrice.toString(),
    };
  }
}
