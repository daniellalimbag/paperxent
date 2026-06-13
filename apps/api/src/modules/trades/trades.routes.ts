import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { ApiSuccessResponse } from '../../shared/http/api-response.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { verifyToken } from '../auth/auth.middleware.js';
import { TradesService } from './trades.service.js';
import type { ExecuteTradeInput, TradeExecutionResult, TradePreviewInput } from './trades.types.js';

const placeTradeSchema = z.object({
  body: z.object({
    side: z.enum(['BUY', 'SELL']),
    ticker: z.string().min(1).max(16),
    quantity: z.string().optional(),
    notional: z.string().optional(),
  }).refine((data) => (data.quantity || data.notional) && !(data.quantity && data.notional), {
    message: 'Exactly one of quantity or notional must be provided.',
  }),
});

const previewTradeSchema = z.object({
  body: z.object({
    side: z.enum(['BUY', 'SELL']),
    ticker: z.string().min(1).max(16),
    quantity: z.string().optional(),
    notional: z.string().optional(),
  }).refine((data) => (data.quantity || data.notional) && !(data.quantity && data.notional), {
    message: 'Exactly one of quantity or notional must be provided.',
  }),
});

const tradesService = new TradesService();

export const tradesRouter = Router();

tradesRouter.post(
  '/preview',
  verifyToken,
  validateRequest(previewTradeSchema),
  asyncHandler(async (req, res) => {
    const { side, ticker, quantity, notional } = previewTradeSchema.shape.body.parse(req.body);
    const input: TradePreviewInput = {
      userId: req.user!.userId,
      side,
      ticker,
      ...(quantity !== undefined ? { quantity } : {}),
      ...(notional !== undefined ? { notional } : {}),
    };
    const preview = await tradesService.previewTrade(input);
    res.status(200).json({ data: preview });
  }),
);

tradesRouter.post(
  '/',
  verifyToken,
  validateRequest(placeTradeSchema),
  asyncHandler(async (req, res) => {
    const { side, ticker, quantity, notional } = placeTradeSchema.shape.body.parse(req.body);
    const input: ExecuteTradeInput = {
      userId: req.user!.userId,
      side,
      ticker,
      ...(quantity !== undefined ? { quantity } : {}),
      ...(notional !== undefined ? { notional } : {}),
    };
    const trade = await tradesService.executeTrade(input);
    const response: ApiSuccessResponse<TradeExecutionResult> = { data: trade };

    res.status(202).json(response);
  }),
);
