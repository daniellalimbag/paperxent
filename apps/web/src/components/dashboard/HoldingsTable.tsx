'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { portfolioApi, ApiError } from '@/lib/api-client';
import type { AssetValuation, PortfolioValuation } from '@paperxent/shared-types';

export function HoldingsTable() {
  const [portfolio, setPortfolio] = useState<PortfolioValuation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        setError(null);
        const data = await portfolioApi.getValuation();
        setPortfolio(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load holdings data');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadPortfolio();
  }, []);

  if (loading) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-20" />
                <Skeleton className="h-12 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !portfolio) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <h2 className="text-lg font-semibold text-paper-ink">Current Holdings</h2>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error || 'Failed to load holdings data'}</p>
        </CardContent>
      </Card>
    );
  }

  const holdings: AssetValuation[] = portfolio.assets ?? [];

  return (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-paper-ink">Current Holdings</h2>
          <Badge variant="neutral">{holdings.length} Positions</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <p className="text-center text-paper-muted py-8">No holdings yet. Start trading to build your portfolio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-paper-line">
                  <th className="text-left py-3 px-4 text-sm font-medium text-paper-muted">Ticker</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">Avg Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">Current</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">Market Value</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-paper-muted">P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => {
                  const quantity = parseFloat(holding.quantity);
                  const avgBuyPrice = parseFloat(holding.averageBuyPrice);
                  const currentPrice = parseFloat(holding.latestPrice);
                  const marketValue = parseFloat(holding.marketValue);
                  const gainLoss = parseFloat(holding.unrealizedPnl);
                  const gainLossPercent = parseFloat(holding.roi) * 100;

                  return (
                    <tr key={holding.ticker} className="border-b border-paper-line hover:bg-paper-50">
                      <td className="py-4 px-4">
                        <span className="font-semibold text-paper-ink">{holding.ticker}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-paper-ink">{quantity}</td>
                      <td className="py-4 px-4 text-right text-sm text-paper-ink">
                        ${avgBuyPrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-paper-ink">
                        ${currentPrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right text-sm font-medium text-paper-ink">
                        ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium ${
                            gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}
                          </span>
                          <span className={`text-xs ${
                            gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
