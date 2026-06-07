import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface Holding {
  ticker: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

const mockHoldings: Holding[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    quantity: 50,
    avgBuyPrice: 150.00,
    currentPrice: 178.50,
    marketValue: 8925.00,
    unrealizedPnL: 1425.00,
    unrealizedPnLPercent: 19.0
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    quantity: 25,
    avgBuyPrice: 220.00,
    currentPrice: 245.30,
    marketValue: 6132.50,
    unrealizedPnL: 632.50,
    unrealizedPnLPercent: 11.5
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    quantity: 30,
    avgBuyPrice: 380.00,
    currentPrice: 415.20,
    marketValue: 12456.00,
    unrealizedPnL: 1056.00,
    unrealizedPnLPercent: 9.26
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    quantity: 15,
    avgBuyPrice: 140.00,
    currentPrice: 135.80,
    marketValue: 2037.00,
    unrealizedPnL: -63.00,
    unrealizedPnLPercent: -3.0
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    quantity: 20,
    avgBuyPrice: 175.00,
    currentPrice: 185.40,
    marketValue: 3708.00,
    unrealizedPnL: 208.00,
    unrealizedPnLPercent: 5.94
  }
];

export function HoldingsTable() {
  return (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-paper-ink">Current Holdings</h2>
          <Badge variant="neutral">{mockHoldings.length} Positions</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-paper-line">
                <th className="text-left py-3 px-4 text-sm font-medium text-paper-muted">Ticker</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-paper-muted">Name</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">Quantity</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">Avg Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">Current</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">Market Value</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">P&L</th>
              </tr>
            </thead>
            <tbody>
              {mockHoldings.map((holding) => (
                <tr key={holding.ticker} className="border-b border-paper-line hover:bg-paper-50">
                  <td className="py-4 px-4">
                    <span className="font-semibold text-paper-ink">{holding.ticker}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-paper-muted">{holding.name}</td>
                  <td className="py-4 px-4 text-right text-sm text-paper-ink">{holding.quantity}</td>
                  <td className="py-4 px-4 text-right text-sm text-paper-ink">
                    ${holding.avgBuyPrice.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-paper-ink">
                    ${holding.currentPrice.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium text-paper-ink">
                    ${holding.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-medium ${
                        holding.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {holding.unrealizedPnL >= 0 ? '+' : ''}${holding.unrealizedPnL.toFixed(2)}
                      </span>
                      <span className={`text-xs ${
                        holding.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {holding.unrealizedPnLPercent >= 0 ? '+' : ''}{holding.unrealizedPnLPercent.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
