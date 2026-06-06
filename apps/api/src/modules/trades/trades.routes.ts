import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { ApiSuccessResponse } from '../../shared/http/api-response.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { TradesService } from './trades.service.js';
import type { ExecuteTradeInput, TradeExecutionResult } from './trades.types.js';

const placeTradeSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
    side: z.enum(['BUY', 'SELL']),
    ticker: z.string().min(1).max(16),
    quantity: z.string().min(1),
    price: z.string().min(1),
  }),
});

const tradesService = new TradesService();

export const tradesRouter = Router();

tradesRouter.post(
  '/',
  validateRequest(placeTradeSchema),
  asyncHandler(async (req, res) => {
    const input = placeTradeSchema.shape.body.parse(req.body) satisfies ExecuteTradeInput;
    const trade = await tradesService.executeTrade(input);
    const response: ApiSuccessResponse<TradeExecutionResult> = { data: trade };

    res.status(202).json(response);
  }),
);
