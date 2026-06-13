export interface MarketMetadata {
  ticker: string;
  name: string;
  category: string[];
}

export const MARKET_METADATA: MarketMetadata[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', category: ['Tech', 'S&P 500', 'Nasdaq 100'] },
  { ticker: 'TSLA', name: 'Tesla, Inc.', category: ['Auto', 'Tech', 'S&P 500', 'Nasdaq 100'] },
  { ticker: 'MSFT', name: 'Microsoft Corporation', category: ['Tech', 'S&P 500', 'Nasdaq 100'] },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', category: ['Tech', 'S&P 500', 'Nasdaq 100'] },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', category: ['Tech', 'S&P 500', 'Nasdaq 100'] },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', category: ['Retail', 'Tech', 'S&P 500', 'Nasdaq 100'] },
  { ticker: 'META', name: 'Meta Platforms, Inc.', category: ['Tech', 'S&P 500', 'Nasdaq 100'] },
  { ticker: 'ROKU', name: 'Roku, Inc.', category: ['Tech', 'Entertainment'] },
  { ticker: 'RDDT', name: 'Reddit, Inc.', category: ['Tech', 'Social Media', 'Hot IPOs'] },
  { ticker: 'ALAB', name: 'Astera Labs, Inc.', category: ['Tech', 'Semiconductors', 'Hot IPOs'] },
  { ticker: 'ARM', name: 'Arm Holdings plc', category: ['Tech', 'Semiconductors', 'Hot IPOs'] },
  { ticker: 'KVUE', name: 'Kenvue Inc.', category: ['Healthcare', 'Consumer Goods', 'Hot IPOs'] },
  { ticker: 'BIRK', name: 'Birkenstock Holding plc', category: ['Consumer Goods', 'Retail', 'Hot IPOs'] },
  { ticker: 'CART', name: 'Instacart (Maplebear Inc.)', category: ['Retail', 'Tech', 'Hot IPOs'] },
];
