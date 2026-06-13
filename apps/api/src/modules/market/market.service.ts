import type { GetQuoteInput, MarketQuote } from './market.types.js';
import { MarketRepository } from './market.repository.js';
import { MARKET_METADATA } from './market-metadata.js';

export class MarketService {
  constructor(private readonly marketRepository = new MarketRepository()) {}

  getQuote(input: GetQuoteInput): Promise<MarketQuote | null> {
    return this.marketRepository.findQuote(input);
  }

  async getQuotes(tickers: string[]): Promise<MarketQuote[]> {
    const quotesMap = await this.marketRepository.findQuotes(tickers);
    return Array.from(quotesMap.values());
  }

  async searchTickers(query: string): Promise<any[]> {
    const q = query.toLowerCase();
    return MARKET_METADATA.filter(
      (m) => m.ticker.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    ).slice(0, 10);
  }

  async getDiscoverData(): Promise<any> {
    const allTickers = MARKET_METADATA.map((m) => m.ticker);
    const quotesMap = await this.marketRepository.findQuotes(allTickers);

    const getQuotesForTickers = (tickers: string[]) =>
      tickers.map((t) => quotesMap.get(t)).filter(Boolean);

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
