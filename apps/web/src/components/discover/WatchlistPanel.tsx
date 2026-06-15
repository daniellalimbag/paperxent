'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { WatchlistItem } from '@paperxent/shared-types';

interface WatchlistPanelProps {
  items: WatchlistItem[];
  loading?: boolean;
  onRemove: (ticker: string) => Promise<void>;
}

export function WatchlistPanel({ items, loading, onRemove }: WatchlistPanelProps) {
  return (
    <section id="watchlist" className="space-y-4 scroll-mt-24">
      <div>
        <h2 className="text-lg font-semibold text-paper-ink">Your watchlist</h2>
        <p className="text-sm text-paper-muted">
          Save tickers from the cards below or a stock page. Quick links to charts and trading.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-paper-muted py-4">Loading watchlist…</p>
      ) : !items.length ? (
        <div className="rounded-xl border border-dashed border-paper-line bg-white/60 px-4 py-8 text-center text-sm text-paper-muted">
          No tickers yet. Use the star on a stock card or &quot;Add to watchlist&quot; on a symbol page.
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((row) => (
            <li
              key={row.ticker}
              className="inline-flex items-center gap-1 rounded-lg border border-paper-line bg-white pl-3 pr-1 py-1 shadow-sm"
            >
              <Link
                href={`/discover/${row.ticker}`}
                className="text-sm font-semibold text-paper-ink uppercase hover:text-sage-600"
              >
                {row.ticker}
              </Link>
              <button
                type="button"
                className="rounded-md p-1 text-paper-muted hover:bg-paper-100 hover:text-paper-ink"
                title={`Remove ${row.ticker}`}
                onClick={() => void onRemove(row.ticker)}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
