export type TradeSide = 'BUY' | 'SELL';

export interface PlaceTradeInput {
  userId: string;
  side: TradeSide;
  ticker: string;
  quantity: string;
  price: string;
}

export interface TradeReceipt {
  transactionId: string;
  status: 'accepted' | 'rejected';
}
