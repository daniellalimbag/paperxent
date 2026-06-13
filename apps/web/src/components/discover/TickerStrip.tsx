'use client';

import React from 'react';
import { useMarketData } from '@/hooks/useMarketData';

const TICKERS = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'META', 'NVDA'];

export function TickerStrip() {
  const { prices } = useMarketData();

  return (
    <div className="flex overflow-x-auto pb-2 gap-4 no-scrollbar">
      {TICKERS.map((ticker) => {
        const data = prices[ticker];
        const price = data?.price ?? 0;
        const change = data?.changePercent ?? 0;
        const isPositive = change >= 0;

        return (
          <div
            key={ticker}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white border border-paper-line rounded-lg shadow-sm"
          >
            <span className="font-bold text-sm text-paper-ink">{ticker}</span>
            <span className="text-sm text-paper-ink">${price.toFixed(2)}</span>
            <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{(change * 100).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
