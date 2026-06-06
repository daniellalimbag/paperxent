import type { GetQuoteInput, MarketQuote } from './market.types.js';

export class MarketRepository {
  async findQuote(_input: GetQuoteInput): Promise<MarketQuote | null> {
    throw new Error('MarketRepository.findQuote is not implemented yet.');
  }
}
