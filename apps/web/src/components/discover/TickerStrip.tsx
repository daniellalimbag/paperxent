'use client';

import React from 'react';
import Link from 'next/link';
import { useLiveMarketTickerRows } from '@/hooks/useLiveMarketTickerRows';

const TICKERS = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'META', 'NVDA'] as const;

export function TickerStrip() {
  const { row } = useLiveMarketTickerRows(TICKERS);

  return (
    <div className="flex overflow-x-auto pb-2 gap-4 no-scrollbar">
      {TICKERS.map((ticker) => {
        const { price, changePercent } = row(ticker);
        const isPositive = changePercent != null ? changePercent >= 0 : true;
        const priceLabel = price != null ? `$${price.toFixed(2)}` : '—';
        const changeLabel =
          changePercent != null
            ? `${isPositive ? '+' : ''}${(changePercent * 100).toFixed(2)}%`
            : '—';
        const changeClass =
          changePercent != null
            ? isPositive
              ? 'text-green-600'
              : 'text-red-600'
            : 'text-paper-muted';

        return (
          <Link
            key={ticker}
            href={`/discover/${ticker}`}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white border border-paper-line rounded-lg shadow-sm hover:bg-paper-50 transition-colors"
          >
            <span className="font-bold text-sm text-paper-ink">{ticker}</span>
            <span className="text-sm text-paper-ink">{priceLabel}</span>
            <span className={`text-xs font-medium ${changeClass}`}>{changeLabel}</span>
          </Link>
        );
      })}
    </div>
  );
}
