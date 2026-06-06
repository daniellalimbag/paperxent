import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { MarketService } from './market.service.js';

const getQuoteSchema = z.object({
  params: z.object({
    ticker: z.string().min(1).max(16),
  }),
});

const marketService = new MarketService();

export const marketRouter = Router();

marketRouter.get(
  '/quotes/:ticker',
  validateRequest(getQuoteSchema),
  asyncHandler(async (req, res) => {
    const { ticker } = getQuoteSchema.shape.params.parse(req.params);
    const quote = await marketService.getQuote({ ticker });
    res.json({ data: quote });
  }),
);
