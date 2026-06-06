export interface MarketQuote {
  ticker: string;
  price: string;
  timestamp: string;
}

export interface GetQuoteInput {
  ticker: string;
}

export interface PriceTick extends MarketQuote {
  previousPrice: string;
  change: string;
  changePercent: string;
}
