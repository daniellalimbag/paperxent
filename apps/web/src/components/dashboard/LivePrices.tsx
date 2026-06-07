import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Activity } from 'lucide-react';

interface PriceData {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

const mockPrices: PriceData[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    price: 178.50,
    change: 2.35,
    changePercent: 1.33,
    volume: 52340000
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    price: 245.30,
    change: -3.20,
    changePercent: -1.29,
    volume: 89230000
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    price: 415.20,
    change: 4.80,
    changePercent: 1.17,
    volume: 21450000
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 135.80,
    change: -1.45,
    changePercent: -1.06,
    volume: 18760000
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 185.40,
    change: 3.25,
    changePercent: 1.78,
    volume: 34560000
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp.',
    price: 875.30,
    change: 12.40,
    changePercent: 1.44,
    volume: 41230000
  },
  {
    ticker: 'META',
    name: 'Meta Platforms',
    price: 505.60,
    change: -2.80,
    changePercent: -0.55,
    volume: 15670000
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase',
    price: 198.45,
    change: 1.15,
    changePercent: 0.58,
    volume: 8920000
  }
];

export function LivePrices() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-paper-ink">Live Market Prices</h2>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-green-500" />
            <span className="text-xs text-paper-muted">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockPrices.map((stock) => (
            <div key={stock.ticker} className="flex items-center justify-between p-3 rounded-lg hover:bg-paper-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-paper-ink">{stock.ticker}</span>
                  <span className="text-xs text-paper-muted">{stock.name}</span>
                </div>
                <p className="text-xs text-paper-muted mt-1">
                  Vol: {(stock.volume / 1000000).toFixed(2)}M
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-semibold text-paper-ink">
                  ${stock.price.toFixed(2)}
                </p>
                <div className="flex items-center justify-end gap-1">
                  {stock.change >= 0 ? (
                    <Badge variant="success">
                      +{stock.change.toFixed(2)} (+{stock.changePercent.toFixed(2)}%)
                    </Badge>
                  ) : (
                    <Badge variant="danger">
                      {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
