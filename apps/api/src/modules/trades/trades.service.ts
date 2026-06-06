import type { PlaceTradeInput, TradeReceipt } from './trades.types.js';
import { TradesRepository } from './trades.repository.js';

export class TradesService {
  constructor(private readonly tradesRepository = new TradesRepository()) {}

  placeTrade(input: PlaceTradeInput): Promise<TradeReceipt> {
    return this.tradesRepository.createTransaction(input);
  }
}
