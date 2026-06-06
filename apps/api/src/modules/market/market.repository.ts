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

  async findQuotes(tickers: string[]): Promise<Map<string, MarketQuote>> {
    const normalizedTickers = Array.from(
      new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean)),
    );

    if (normalizedTickers.length === 0) {
      return new Map();
    }

    const rawQuotes = await this.cache.mget(
      normalizedTickers.map((ticker) => this.getLatestPriceKey(ticker)),
    );

    return rawQuotes.reduce<Map<string, MarketQuote>>((quotes, rawQuote) => {
      if (!rawQuote) {
        return quotes;
      }

      const quote = JSON.parse(rawQuote) as MarketQuote;
      quotes.set(quote.ticker, quote);

      return quotes;
    }, new Map());
  }

  async saveQuote(quote: MarketQuote): Promise<void> {
    await this.cache.set(this.getLatestPriceKey(quote.ticker), JSON.stringify(quote));
  }

  private getLatestPriceKey(ticker: string) {
    return `market:latest:${ticker}`;
  }
}
