'use client';

import React from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

interface Stock {
  ticker: string;
  name: string;
  logo?: string;
}

interface DiscoverCardGridProps {
  title: string;
  subtitle?: string;
  stocks: Stock[];
  /** Tickers already on the user's watchlist */
  watchedTickers?: ReadonlySet<string>;
  /** Toggle watchlist membership (parent handles API + toast) */
  onWatchToggle?: (ticker: string, isCurrentlyWatched: boolean) => void;
  watchToggleDisabled?: boolean;
}

export function DiscoverCardGrid({
  title,
  subtitle,
  stocks,
  watchedTickers,
  onWatchToggle,
  watchToggleDisabled,
}: DiscoverCardGridProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-paper-ink">{title}</h2>
        {subtitle && <p className="text-sm text-paper-muted">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {stocks.map((stock) => {
          const watched = watchedTickers?.has(stock.ticker.toUpperCase()) ?? false;
          const showStar = onWatchToggle != null;

          return (
            <div key={stock.ticker} className="relative group/card">
              <Link href={`/discover/${stock.ticker}`} className="block">
                <Card className="hover:bg-paper-50 cursor-pointer transition-colors border-paper-line/50 h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-paper-100 flex items-center justify-center text-paper-muted font-bold text-lg">
                      {stock.ticker[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-paper-ink uppercase">{stock.ticker}</p>
                      <p className="text-xs text-paper-muted truncate w-full max-w-[100px]">{stock.name}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {showStar && (
                <button
                  type="button"
                  disabled={watchToggleDisabled}
                  title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                  className={`absolute right-1 top-1 rounded-md p-1.5 transition-colors ${
                    watched
                      ? 'text-amber-600 bg-white/90 shadow-sm border border-paper-line'
                      : 'text-paper-muted opacity-0 group-hover/card:opacity-100 hover:text-amber-600 bg-white/90'
                  } ${watchToggleDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onWatchToggle(stock.ticker.toUpperCase(), watched);
                  }}
                >
                  <Star
                    size={16}
                    className={watched ? 'fill-amber-500 text-amber-600' : 'text-paper-muted'}
                    strokeWidth={watched ? 0 : 2}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
