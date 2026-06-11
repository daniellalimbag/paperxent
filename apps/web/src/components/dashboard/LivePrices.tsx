'use client';

import { useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Activity } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { useMarketData } from '@/hooks/useMarketData';

const TICKERS = ['AAPL', 'TSLA', 'MSFT'];

export function LivePrices() {
  const { prices, isConnected, subscribe } = useMarketData();

  useEffect(() => {
    subscribe(TICKERS);
  }, [subscribe]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-paper-ink">Live Market Prices</h2>
          <div className="flex items-center gap-2">
            <Activity size={16} className={isConnected ? 'text-green-500' : 'text-slate-500'} />
            <span className="text-xs text-paper-muted">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {TICKERS.map((ticker) => {
            const priceData = prices[ticker];

            if (!priceData) {
              return (
                <div key={ticker} className="flex items-center justify-between p-3 rounded-lg">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-20 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              );
            }

            const change = priceData.change;
            const changePercent = priceData.changePercent;

            return (
              <div key={ticker} className="flex items-center justify-between p-3 rounded-lg hover:bg-paper-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-paper-ink">{ticker}</span>
                  </div>
                  <p className="text-xs text-paper-muted mt-1">
                    Last updated: {new Date(priceData.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-paper-ink">
                    ${priceData.price.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    {change >= 0 ? (
                      <Badge variant="success">
                        +{change.toFixed(2)} (+{changePercent.toFixed(2)}%)
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        {change.toFixed(2)} ({changePercent.toFixed(2)}%)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
