import type { GetQuoteInput, MarketQuote } from './market.types.js';
import { redis } from '../../shared/cache/redis.js';

export class MarketRepository {
  constructor(private readonly cache = redis) {}

  async findQuote(input: GetQuoteInput): Promise<MarketQuote | null> {
    const ticker = input.ticker.trim().toUpperCase();
    const rawQuote = await this.cache.get(this.getLatestPriceKey(ticker));

    if (!rawQuote) {
      return null;
    }

    return JSON.parse(rawQuote) as MarketQuote;
  }

  async saveQuote(quote: MarketQuote): Promise<void> {
    await this.cache.set(this.getLatestPriceKey(quote.ticker), JSON.stringify(quote));
  }

  private getLatestPriceKey(ticker: string) {
    return `market:latest:${ticker}`;
  }
}
