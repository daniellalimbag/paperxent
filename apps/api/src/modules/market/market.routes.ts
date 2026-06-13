import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { MarketService } from './market.service.js';
import { isMarketstackEnabled } from './marketstack.service.js';
import { AppError } from '../../shared/errors/app-error.js';

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

const CANDLE_RESOLUTIONS = ['1', '5', '15', '30', '60', 'D', 'W', 'M'] as const;

const candlesSchema = z.object({
  params: z.object({
    ticker: z.string().min(1).max(16),
  }),
  query: z.object({
    resolution: z.string().optional(),
    from: z.coerce.number().int().optional(),
    to: z.coerce.number().int().optional(),
  }),
});

const marketService = new MarketService();

export const marketRouter = Router();

marketRouter.get(
  '/features',
  asyncHandler(async (_req, res) => {
    res.json({ data: { marketstackEnabled: isMarketstackEnabled() } });
  }),
);

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
  '/candles/:ticker',
  validateRequest(candlesSchema),
  asyncHandler(async (req, res) => {
    if (!isMarketstackEnabled()) {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message:
          'Live price charts require MARKETSTACK_ACCESS_KEY on the API server. Get a key at https://marketstack.com/ and restart the API.',
        statusCode: 503,
      });
    }

    const { ticker } = candlesSchema.shape.params.parse(req.params);
    const q = candlesSchema.shape.query.parse(req.query);
    const resolution = CANDLE_RESOLUTIONS.includes((q.resolution ?? 'D') as (typeof CANDLE_RESOLUTIONS)[number])
      ? (q.resolution as (typeof CANDLE_RESOLUTIONS)[number])
      : 'D';

    const toSec = q.to ?? Math.floor(Date.now() / 1000);
    const fromSec = q.from ?? toSec - 90 * 24 * 60 * 60;

    const data = await marketService.getCandles(ticker, resolution, fromSec, toSec);
    res.json({ data });
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
