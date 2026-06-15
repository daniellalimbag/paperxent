'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { DiscoverSearch } from '@/components/discover/DiscoverSearch';
import { TickerStrip } from '@/components/discover/TickerStrip';
import { MarketFilterChips } from '@/components/discover/MarketFilterChips';
import { TopMovers } from '@/components/discover/TopMovers';
import { DiscoverCardGrid } from '@/components/discover/DiscoverCardGrid';
import { WatchlistPanel } from '@/components/discover/WatchlistPanel';
import { marketApi, watchlistApi, ApiError } from '@/lib/api-client';
import type { DiscoverData } from '@/lib/api-client';
import type { WatchlistItem } from '@paperxent/shared-types';
import { toast } from 'sonner';

const EVERYONE_BUYING = [
  { ticker: 'NVDA', name: 'NVIDIA Corp.' },
  { ticker: 'NOK', name: 'Nokia' },
  { ticker: 'MU', name: 'Micron Technology' },
  { ticker: 'MRVL', name: 'Marvell Technology' },
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'MSFT', name: 'Microsoft' },
];

const HOT_IPOS = [
  { ticker: 'RDDT', name: 'Reddit' },
  { ticker: 'ALAB', name: 'Astera Labs' },
  { ticker: 'ARM', name: 'Arm Holdings' },
  { ticker: 'KVUE', name: 'Kenvue' },
  { ticker: 'BIRK', name: 'Birkenstock' },
  { ticker: 'CART', name: 'Instacart' },
];

function quotesToStockRows(quotes: { ticker: string; name?: string }[]): { ticker: string; name: string }[] {
  return quotes.map((q) => ({ ticker: q.ticker, name: q.name || q.ticker }));
}

export default function DiscoverPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const loadWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const rows = await watchlistApi.list();
      setWatchlist(rows);
    } catch {
      setWatchlist([]);
    } finally {
      setWatchlistLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchDiscoverData = async () => {
      try {
        const data = await marketApi.getDiscover();
        setDiscoverData(data);
      } catch (error) {
        console.error('Failed to fetch discover data:', error);
        setDiscoverData(null);
      }
    };

    if (user) {
      void fetchDiscoverData();
      void loadWatchlist();
    }
  }, [user, loadWatchlist]);

  const watchedSet = useMemo(
    () => new Set(watchlist.map((w) => w.ticker.toUpperCase())),
    [watchlist],
  );

  const handleWatchToggle = async (ticker: string, isWatched: boolean) => {
    try {
      if (isWatched) {
        await watchlistApi.remove(ticker);
        setWatchlist((prev) => prev.filter((i) => i.ticker.toUpperCase() !== ticker.toUpperCase()));
        toast.success(`Removed ${ticker} from watchlist`);
      } else {
        const row = await watchlistApi.add(ticker);
        setWatchlist((prev) => {
          const rest = prev.filter((i) => i.ticker.toUpperCase() !== row.ticker.toUpperCase());
          return [row, ...rest];
        });
        toast.success(`Added ${ticker} to watchlist`);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Watchlist update failed';
      toast.error(msg);
    }
  };

  const handleWatchRemove = async (ticker: string) => {
    try {
      await watchlistApi.remove(ticker);
      setWatchlist((prev) => prev.filter((i) => i.ticker.toUpperCase() !== ticker.toUpperCase()));
      toast.success(`Removed ${ticker}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not remove ticker';
      toast.error(msg);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100">
        <p className="text-paper-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper-100">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-8 pb-24">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-paper-ink tracking-tight">Discover</h1>
              <p className="text-paper-muted mt-1">Explore the market and find your next trade.</p>
            </div>
            <DiscoverSearch />
          </div>

          {/* Ticker Strip */}
          <TickerStrip />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12 space-y-10">
              <WatchlistPanel
                items={watchlist}
                loading={watchlistLoading}
                onRemove={handleWatchRemove}
              />

              {/* Characteristics / Filters */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-paper-ink">Characteristics</h2>
                <MarketFilterChips />
              </section>

              {/* Top Movers */}
              <TopMovers />

              {/* Curated Lists */}
              <DiscoverCardGrid
                title="What everyone is buying 🔥"
                subtitle="Most bought stocks in PaperXent in the last 7 days."
                stocks={
                  discoverData?.trending?.length
                    ? quotesToStockRows(discoverData.trending)
                    : EVERYONE_BUYING
                }
                watchedTickers={watchedSet}
                onWatchToggle={handleWatchToggle}
              />

              <DiscoverCardGrid
                title="Hot IPOs 🚀"
                subtitle="Recently listed companies making waves."
                stocks={
                  discoverData?.ipos?.length ? quotesToStockRows(discoverData.ipos) : HOT_IPOS
                }
                watchedTickers={watchedSet}
                onWatchToggle={handleWatchToggle}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
