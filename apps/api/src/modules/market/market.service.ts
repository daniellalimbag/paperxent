import type { GetQuoteInput, MarketQuote, DiscoverResponse } from './market.types.js';
import { MarketRepository } from './market.repository.js';
import { MARKET_METADATA, type MarketMetadata } from './market-metadata.js';

export class MarketService {
  constructor(private readonly marketRepository = new MarketRepository()) {}

  async getQuote(input: GetQuoteInput): Promise<MarketQuote | null> {
    const quote = await this.marketRepository.findQuote(input);
    if (!quote) return null;

    const metadata = MARKET_METADATA.find((m) => m.ticker === quote.ticker);
    return {
      ...quote,
      name: metadata?.name,
    };
  }

  async getQuotes(tickers: string[]): Promise<MarketQuote[]> {
    const quotesMap = await this.marketRepository.findQuotes(tickers);
    return Array.from(quotesMap.values());
  }

  async searchTickers(query: string): Promise<MarketMetadata[]> {
    const q = query.toLowerCase();
    return MARKET_METADATA.filter(
      (m) => m.ticker.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    ).slice(0, 10);
  }

  async getDiscoverData(): Promise<DiscoverResponse> {
    const allTickers = MARKET_METADATA.map((m) => m.ticker);
    const quotesMap = await this.marketRepository.findQuotes(allTickers);

    const getQuotesForTickers = (tickers: string[]): MarketQuote[] =>
      tickers
        .map((t) => quotesMap.get(t))
        .filter((q): q is MarketQuote => q != null);

    return {
      trending: getQuotesForTickers(['NVDA', 'TSLA', 'AAPL', 'MSFT', 'META', 'GOOGL']),
      movers: Array.from(quotesMap.values())
        .sort(
          (a, b) =>
            Math.abs(Number(b.changePercent ?? 0)) - Math.abs(Number(a.changePercent ?? 0)),
        )
        .slice(0, 10),
      ipos: getQuotesForTickers(['RDDT', 'ALAB', 'ARM', 'KVUE', 'BIRK', 'CART']),
    };
  }
}
