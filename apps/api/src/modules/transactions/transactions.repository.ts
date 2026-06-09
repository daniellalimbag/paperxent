import type { Prisma } from '@prisma/client';
import { prisma } from '@paperxent/database';
import type { PrismaClient } from '@prisma/client';
import type { ListTransactionsFilters } from './transactions.types.js';

export class TransactionsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listTransactions(filters: ListTransactionsFilters) {
    const { userId, cursor, limit, type, ticker, from, to } = filters;

    const whereBase: Prisma.TransactionWhereInput = {
      userId,
      ...(type ? { type } : {}),
      ...(ticker
        ? {
            ticker: {
              equals: ticker.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...((from || to) && {
        timestamp: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      }),
    };

    let where: Prisma.TransactionWhereInput = whereBase;

    if (cursor) {
      const anchor = await this.db.transaction.findFirst({
        where: { id: cursor, userId },
      });

      if (!anchor) {
        return { invalidCursor: true as const };
      }

      where = {
        AND: [
          whereBase,
          {
            OR: [
              { timestamp: { lt: anchor.timestamp } },
              {
                AND: [{ timestamp: anchor.timestamp }, { id: { lt: anchor.id } }],
              },
            ],
          },
        ],
      };
    }

    const take = limit + 1;
    const rows = await this.db.transaction.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

    return { items, nextCursor, hasMore, invalidCursor: false as const };
  }
}
