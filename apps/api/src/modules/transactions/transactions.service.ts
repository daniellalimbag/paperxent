import { Prisma } from '@prisma/client';
import type { TransactionType } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error.js';
import type { PaginatedResponse, TransactionHistoryItem } from '@paperxent/shared-types';
import { TransactionsRepository } from './transactions.repository.js';

export interface ListTransactionsParams {
  requesterUserId: string;
  pathUserId: string;
  cursor?: string;
  limit: number;
  type?: TransactionType;
  ticker?: string;
  from?: string;
  to?: string;
}

function parseOptionalDate(value: string | undefined, label: 'from' | 'to'): Date | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Invalid ${label} date; use an ISO-8601 string.`,
      statusCode: 400,
    });
  }
  return d;
}

function mapRow(row: {
  id: string;
  userId: string;
  type: TransactionType;
  ticker: string;
  quantity: Prisma.Decimal;
  price: Prisma.Decimal;
  timestamp: Date;
}): TransactionHistoryItem {
  const qty = new Prisma.Decimal(row.quantity);
  const px = new Prisma.Decimal(row.price);
  const total = qty.mul(px);

  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    ticker: row.ticker,
    quantity: row.quantity.toString(),
    price: row.price.toString(),
    total: total.toString(),
    timestamp: row.timestamp.toISOString(),
  };
}

export class TransactionsService {
  constructor(private readonly repository = new TransactionsRepository()) {}

  async listTransactions(params: ListTransactionsParams): Promise<PaginatedResponse<TransactionHistoryItem>> {
    if (params.requesterUserId !== params.pathUserId) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'You can only list your own transactions.',
        statusCode: 403,
      });
    }

    const from = parseOptionalDate(params.from, 'from');
    const to = parseOptionalDate(params.to, 'to');

    if (from && to && from > to) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: '`from` must be before or equal to `to`.',
        statusCode: 400,
      });
    }

    const result = await this.repository.listTransactions({
      userId: params.pathUserId,
      cursor: params.cursor,
      limit: params.limit,
      type: params.type,
      ticker: params.ticker,
      from,
      to,
    });

    if (result.invalidCursor) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Invalid cursor.',
        statusCode: 400,
      });
    }

    return {
      items: result.items.map(mapRow),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }
}
