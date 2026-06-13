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

const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1),
  }),
});

const batchQuotesSchema = z.object({
  query: z.object({
    tickers: z.string().min(1),
  }),
});

const marketService = new MarketService();

export const marketRouter = Router();

marketRouter.get(
  '/discover',
  asyncHandler(async (req, res) => {
    const data = await marketService.getDiscoverData();
    res.json({ data });
  }),
);

marketRouter.get(
  '/search',
  validateRequest(searchSchema),
  asyncHandler(async (req, res) => {
    const { q } = searchSchema.shape.query.parse(req.query);
    const results = await marketService.searchTickers(q);
    res.json({ data: results });
  }),
);

marketRouter.get(
  '/quotes',
  validateRequest(batchQuotesSchema),
  asyncHandler(async (req, res) => {
    const { tickers } = batchQuotesSchema.shape.query.parse(req.query);
    const tickerList = tickers.split(',').map((t) => t.trim());
    const quotes = await marketService.getQuotes(tickerList);
    res.json({ data: quotes });
  }),
);

marketRouter.get(
  '/quotes/:ticker',
  validateRequest(getQuoteSchema),
  asyncHandler(async (req, res) => {
    const { ticker } = getQuoteSchema.shape.params.parse(req.params);
    const quote = await marketService.getQuote({ ticker });
    res.json({ data: quote });
  }),
);
