import type { GetQuoteInput, MarketQuote } from './market.types.js';
import { MarketRepository } from './market.repository.js';

export class MarketService {
  constructor(private readonly marketRepository = new MarketRepository()) {}

  getQuote(input: GetQuoteInput): Promise<MarketQuote | null> {
    return this.marketRepository.findQuote(input);
  }
}
