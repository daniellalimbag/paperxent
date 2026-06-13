'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TradeForm } from '@/components/dashboard/TradeForm';
import { useAuth } from '@/contexts/AuthContext';
import { DiscoverSearch } from '@/components/discover/DiscoverSearch';
import { TickerStrip } from '@/components/discover/TickerStrip';
import { MarketFilterChips } from '@/components/discover/MarketFilterChips';
import { TopMovers } from '@/components/discover/TopMovers';
import { DiscoverCardGrid } from '@/components/discover/DiscoverCardGrid';

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

interface DiscoverQuote {
  ticker: string;
}

interface DiscoverPayload {
  trending: DiscoverQuote[];
  movers: DiscoverQuote[];
  ipos: DiscoverQuote[];
}

function isDiscoverQuoteList(value: unknown): value is DiscoverQuote[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'ticker' in item &&
        typeof (item as { ticker: unknown }).ticker === 'string',
    )
  );
}

function parseDiscoverPayload(data: unknown): DiscoverPayload | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const o = data as Record<string, unknown>;
  if (!isDiscoverQuoteList(o.trending) || !isDiscoverQuoteList(o.movers) || !isDiscoverQuoteList(o.ipos)) {
    return null;
  }
  return { trending: o.trending, movers: o.movers, ipos: o.ipos };
}

function quotesToStockRows(quotes: DiscoverQuote[]): { ticker: string; name: string }[] {
  return quotes.map((q) => ({ ticker: q.ticker, name: q.ticker }));
}

export default function DiscoverPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedTicker, setSelectedTicker] = useState('');
  const [discoverData, setDiscoverData] = useState<DiscoverPayload | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    const fetchDiscoverData = async () => {
      try {
        const response = await fetch('/proxy/api/market/discover');
        const json: unknown = await response.json();
        const rawData =
          typeof json === 'object' && json !== null && 'data' in json
            ? (json as { data: unknown }).data
            : null;
        const parsed = parseDiscoverPayload(rawData);
        setDiscoverData(parsed);
      } catch (error) {
        console.error('Failed to fetch discover data:', error);
        setDiscoverData(null);
      }
    };

    if (user) {
      void fetchDiscoverData();
    }
  }, [user]);

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
            {/* Main Discovery Area */}
            <div className="lg:col-span-8 space-y-10">
              {/* Characteristics / Filters */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-paper-ink">Characteristics</h2>
                <MarketFilterChips />
              </section>

              {/* Top Movers */}
              <TopMovers onSelect={setSelectedTicker} />

              {/* Curated Lists */}
              <DiscoverCardGrid
                title="What everyone is buying 🔥"
                subtitle="Most bought stocks in PaperXent in the last 7 days."
                stocks={
                  discoverData?.trending?.length
                    ? quotesToStockRows(discoverData.trending)
                    : EVERYONE_BUYING
                }
                onSelect={setSelectedTicker}
              />

              <DiscoverCardGrid
                title="Hot IPOs 🚀"
                subtitle="Recently listed companies making waves."
                stocks={
                  discoverData?.ipos?.length ? quotesToStockRows(discoverData.ipos) : HOT_IPOS
                }
                onSelect={setSelectedTicker}
              />
            </div>

            {/* Side Trading Panel */}
            <div className="lg:col-span-4">
              <div className="sticky top-6 space-y-6">
                <TradeForm initialTicker={selectedTicker} />
                
                <div className="bg-paper-50 border border-paper-line rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-paper-ink">Market Status</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-paper-muted">US Markets</span>
                    <span className="text-green-600 font-medium">Open</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-paper-muted">Next Close</span>
                    <span className="text-paper-ink font-medium">4:00 PM EST</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
