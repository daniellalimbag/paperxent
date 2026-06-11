import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { ApiSuccessResponse } from '../../shared/http/api-response.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { verifyToken } from '../auth/auth.middleware.js';
import type { PaginatedResponse, TransactionHistoryItem } from '@paperxent/shared-types';
import { TransactionsService, type ListTransactionsParams } from './transactions.service.js';

const listTransactionsSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  query: z.object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    type: z.enum(['BUY', 'SELL']).optional(),
    ticker: z.string().trim().max(16).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

const transactionsService = new TransactionsService();

export const transactionsRouter = Router();

transactionsRouter.get(
  '/:userId',
  verifyToken,
  validateRequest(listTransactionsSchema),
  asyncHandler(async (req, res) => {
    const { userId } = listTransactionsSchema.shape.params.parse(req.params);
    const q = listTransactionsSchema.shape.query.parse(req.query);
    const limit = q.limit ?? 20;

    const listParams: ListTransactionsParams = {
      requesterUserId: req.user!.userId,
      pathUserId: userId,
      limit,
    };
    if (q.cursor) listParams.cursor = q.cursor;
    if (q.type) listParams.type = q.type;
    const ticker = q.ticker?.trim();
    if (ticker) listParams.ticker = ticker;
    if (q.from) listParams.from = q.from;
    if (q.to) listParams.to = q.to;

    const page: PaginatedResponse<TransactionHistoryItem> = await transactionsService.listTransactions(listParams);

    const response: ApiSuccessResponse<PaginatedResponse<TransactionHistoryItem>> = {
      data: page,
    };

    res.json(response);
  }),
);
