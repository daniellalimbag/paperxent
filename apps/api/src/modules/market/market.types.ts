export interface MarketQuote {
  ticker: string;
  price: string;
  timestamp: string;
}

export interface GetQuoteInput {
  ticker: string;
}
