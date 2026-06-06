import type { PlaceTradeInput, TradeReceipt } from './trades.types.js';

export class TradesRepository {
  async createTransaction(_input: PlaceTradeInput): Promise<TradeReceipt> {
    throw new Error('TradesRepository.createTransaction is not implemented yet.');
  }
}
