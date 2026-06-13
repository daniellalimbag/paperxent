export interface MarketQuote {
  ticker: string;
  price: string;
  timestamp: string;
  /** Present when quote comes from the live price feed / tick payload */
  previousPrice?: string;
  change?: string;
  changePercent?: string;
}

export interface GetQuoteInput {
  ticker: string;
}

export interface PriceTick extends MarketQuote {
  previousPrice: string;
  change: string;
  changePercent: string;
}

/** Curated sections for GET /api/market/discover */
export interface DiscoverResponse {
  trending: MarketQuote[];
  movers: MarketQuote[];
  ipos: MarketQuote[];
}
