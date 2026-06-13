export interface MarketQuote {
  ticker: string;
  price: string;
  timestamp: string;
  name?: string | undefined;
  /** Present when quote comes from the live price feed / tick payload */
  previousPrice?: string;
  change?: string;
  changePercent?: string;
  /** `live` = Marketstack (or other external); `simulated` = Redis sim feed */
  source?: 'live' | 'simulated';
  /** Session / day open when provided by upstream */
  open?: string;
  high?: string;
  low?: string;
}

/** OHLCV series for charting (normalized daily bars from Marketstack EOD). */
export interface MarketCandles {
  ticker: string;
  resolution: string;
  bars: {
    time: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }[];
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
