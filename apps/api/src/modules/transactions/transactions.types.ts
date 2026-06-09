import type { TransactionType } from '@prisma/client';

export interface ListTransactionsFilters {
  userId: string;
  cursor?: string;
  limit: number;
  type?: TransactionType;
  ticker?: string;
  from?: Date;
  to?: Date;
}
