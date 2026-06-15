'use client';

import React from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function RecentlyViewedPanel() {
  const { items, clearRecent } = useRecentlyViewed();

  if (items.length === 0) return null;

  return (
    <Card className="border-paper-line/60">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-paper-50/50 border-b border-paper-line/40">
        <div className="flex items-center gap-2">
          <History size={16} className="text-paper-muted" />
          <h2 className="text-sm font-bold text-paper-ink uppercase tracking-wider">Recently Viewed</h2>
        </div>
        <Button
          variant="outline"
          onClick={clearRecent}
          className="h-7 px-2 text-xs text-paper-muted hover:text-red-600"
        >
          Clear
        </Button>
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Link
              key={item.ticker}
              href={`/discover/${item.ticker}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-paper-line hover:border-sage-500 hover:shadow-sm transition-all group"
            >
              <span className="font-bold text-paper-ink group-hover:text-sage-600">{item.ticker}</span>
              <span className="text-xs text-paper-muted truncate max-w-[100px]">{item.name}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
