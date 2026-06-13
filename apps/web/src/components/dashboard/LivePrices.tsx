'use client';

import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Activity } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { useLiveMarketTickerRows } from '@/hooks/useLiveMarketTickerRows';

const TICKERS = ['AAPL', 'TSLA', 'MSFT'] as const;

export function LivePrices() {
  const { row, wsConnected, mode } = useLiveMarketTickerRows(TICKERS);

  const headerLive = mode === 'live' ? true : wsConnected;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-paper-ink">Live Market Prices</h2>
          <div className="flex items-center gap-2">
            <Activity size={16} className={headerLive ? 'text-green-500' : 'text-slate-500'} />
            <span className="text-xs text-paper-muted">
              {mode === 'loading'
                ? 'Loading…'
                : mode === 'live'
                  ? 'Marketstack (refreshed periodically)'
                  : wsConnected
                    ? 'Simulated feed'
                    : 'Connecting...'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {TICKERS.map((ticker) => {
            const r = row(ticker);

            if (r.price == null) {
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

            const change = r.change ?? 0;
            const changePercentFrac = r.changePercent ?? 0;
            const pctLabel = (changePercentFrac * 100).toFixed(2);

            return (
              <div
                key={ticker}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-paper-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-paper-ink">{ticker}</span>
                  </div>
                  <p className="text-xs text-paper-muted mt-1">
                    Last updated:{' '}
                    {r.timestampMs != null
                      ? new Date(r.timestampMs).toLocaleTimeString()
                      : '—'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-paper-ink">${r.price.toFixed(2)}</p>
                  <div className="flex items-center justify-end gap-1">
                    {change >= 0 ? (
                      <Badge variant="success">
                        +{change.toFixed(2)} (+{pctLabel}%)
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        {change.toFixed(2)} ({pctLabel}%)
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
