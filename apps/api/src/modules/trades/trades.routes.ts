import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { TradesService } from './trades.service.js';

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
    const trade = await tradesService.placeTrade(req.body);
    res.status(202).json({ data: trade });
  }),
);
