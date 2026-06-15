import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { ApiSuccessResponse } from '../../shared/http/api-response.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { verifyToken } from '../auth/auth.middleware.js';
import { WatchlistService } from './watchlist.service.js';
import type { WatchlistItem } from './watchlist.types.js';

const service = new WatchlistService();

const addBodySchema = z.object({
  body: z.object({
    ticker: z.string().min(1).max(16),
  }),
});

const tickerParamSchema = z.object({
  params: z.object({
    ticker: z.string().min(1).max(16),
  }),
});

export const watchlistRouter = Router();

watchlistRouter.get(
  '/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const data = await service.list(userId);
    const response: ApiSuccessResponse<WatchlistItem[]> = { data };
    res.json(response);
  }),
);

watchlistRouter.post(
  '/',
  verifyToken,
  validateRequest(addBodySchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { ticker } = addBodySchema.shape.body.parse(req.body);
    const item = await service.add(userId, ticker);
    const response: ApiSuccessResponse<WatchlistItem> = { data: item };
    res.status(201).json(response);
  }),
);

watchlistRouter.delete(
  '/:ticker',
  verifyToken,
  validateRequest(tickerParamSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { ticker } = tickerParamSchema.shape.params.parse(req.params);
    await service.remove(userId, ticker);
    res.status(204).send();
  }),
);
