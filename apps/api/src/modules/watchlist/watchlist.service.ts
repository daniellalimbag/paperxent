import { AppError } from '../../shared/errors/app-error.js';
import { WatchlistRepository } from './watchlist.repository.js';
import type { WatchlistItem } from './watchlist.types.js';

const TICKER_PATTERN = /^[A-Z][A-Z0-9.]{0,15}$/;
const MAX_WATCHLIST = 100;

export class WatchlistService {
  constructor(private readonly repo = new WatchlistRepository()) {}

  async list(userId: string): Promise<WatchlistItem[]> {
    const rows = await this.repo.listByUserId(userId);
    return rows.map((r) => ({
      ticker: r.ticker,
      addedAt: r.createdAt.toISOString(),
    }));
  }

  async add(userId: string, rawTicker: string): Promise<WatchlistItem> {
    const ticker = rawTicker.trim().toUpperCase();
    if (!TICKER_PATTERN.test(ticker)) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Ticker must be 1–16 uppercase letters, numbers, or periods.',
        statusCode: 400,
      });
    }

    if (await this.repo.exists(userId, ticker)) {
      throw new AppError({
        code: 'CONFLICT',
        message: `${ticker} is already on your watchlist.`,
        statusCode: 409,
      });
    }

    const n = await this.repo.countByUserId(userId);
    if (n >= MAX_WATCHLIST) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: `Watchlist is limited to ${MAX_WATCHLIST} tickers.`,
        statusCode: 400,
      });
    }

    const row = await this.repo.create(userId, ticker);
    return { ticker: row.ticker, addedAt: row.createdAt.toISOString() };
  }

  async remove(userId: string, rawTicker: string): Promise<void> {
    const ticker = rawTicker.trim().toUpperCase();
    const ok = await this.repo.delete(userId, ticker);
    if (!ok) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'That ticker is not on your watchlist.',
        statusCode: 404,
      });
    }
  }
}
