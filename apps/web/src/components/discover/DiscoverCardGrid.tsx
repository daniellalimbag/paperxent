'use client';

import React from 'react';
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
  onSelect?: (ticker: string) => void;
}

export function DiscoverCardGrid({ title, subtitle, stocks, onSelect }: DiscoverCardGridProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-paper-ink">{title}</h2>
        {subtitle && <p className="text-sm text-paper-muted">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {stocks.map((stock) => (
          <Card 
            key={stock.ticker} 
            className="hover:bg-paper-50 cursor-pointer transition-colors border-paper-line/50"
            onClick={() => onSelect?.(stock.ticker)}
          >
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
        ))}
      </div>
    </div>
  );
}
