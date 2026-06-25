'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { marketApi, portfolioApi, watchlistApi, ApiError, type MarketQuote } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, DollarSign, Briefcase, Star, Bell } from 'lucide-react';
import Link from 'next/link';
import { TradeModal } from '@/components/discover/TradeModal';
import { CreateAlertForm } from '@/components/alerts/CreateAlertForm';
import { StockPriceChart } from '@/components/discover/StockPriceChart';
import type { PortfolioValuation } from '@paperxent/shared-types';
import { toast } from 'sonner';

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export default function StockDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: rawTicker } = use(params);
  const ticker = rawTicker.toUpperCase();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addViewed } = useRecentlyViewed();
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [holdingsQty, setHoldingsQty] = useState<string | null>(null);
  const [onWatchlist, setOnWatchlist] = useState<boolean | null>(null);

  const toggleWatchlist = useCallback(async () => {
    if (onWatchlist == null) return;
    try {
      if (onWatchlist) {
        await watchlistApi.remove(ticker);
        setOnWatchlist(false);
        toast.success(`Removed ${ticker} from your watchlist`);
      } else {
        await watchlistApi.add(ticker);
        setOnWatchlist(true);
        toast.success(`Added ${ticker} to your watchlist`);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update watchlist');
    }
  }, [onWatchlist, ticker]);

  const loadQuote = useCallback(async () => {
    try {
      const data = await marketApi.getQuote(rawTicker);
      setQuote(data);
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [rawTicker]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      void loadQuote();
    }
  }, [user, loadQuote]);

  useEffect(() => {
    if (quote) {
      addViewed(quote.ticker, quote.name || quote.ticker);
    }
  }, [quote, addViewed]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void watchlistApi
      .list()
      .then((rows) => {
        if (cancelled) return;
        setOnWatchlist(rows.some((r) => r.ticker.toUpperCase() === ticker));
      })
      .catch(() => {
        if (!cancelled) setOnWatchlist(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, ticker]);

  useEffect(() => {
    if (!user?.id) return;
    const t = quote?.source === 'live' ? 60_000 : 15_000;
    const id = window.setInterval(() => {
      void loadQuote();
    }, t);
    return () => window.clearInterval(id);
  }, [user?.id, quote?.source, loadQuote]);

  useEffect(() => {
    if (!user?.id || !quote) return;
    let cancelled = false;
    void (async () => {
      try {
        const p: PortfolioValuation = await portfolioApi.getValuation();
        if (cancelled) return;
        const row = p.assets?.find((a) => a.ticker.toUpperCase() === ticker);
        setHoldingsQty(row ? num(row.quantity).toFixed(4) : '0');
      } catch {
        if (!cancelled) setHoldingsQty('0');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, quote, ticker]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100">
        <p className="text-paper-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper-100 space-y-4">
        <p className="text-paper-muted text-sm">Stock not found or no price data yet.</p>
        <Button onClick={() => router.back()} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const displayPrice = num(quote.price);
  const displayChange = num(quote.change);
  const displayChangePercent = num(quote.changePercent, 0);
  const isPositive = displayChangePercent >= 0;
  const dayOpen = quote.open != null ? num(quote.open) : null;
  const dayHigh = quote.high != null ? num(quote.high) : null;
  const dayLow = quote.low != null ? num(quote.low) : null;

  return (
    <div className="flex min-h-screen bg-paper-100">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-8 pb-24">
          <Link
            href="/discover"
            className="inline-flex items-center text-sm text-paper-muted hover:text-paper-ink transition-colors"
          >
            <ChevronLeft size={16} className="mr-1" />
            Back to Discover
          </Link>

          {quote.source === 'live' ? (
            <p className="text-xs text-paper-muted rounded-lg border border-paper-line bg-white/80 px-3 py-2">
              Prices reflect live EOD data (Marketstack). Paper trades use the latest quote when you confirm.
            </p>
          ) : (
            <p className="text-xs text-paper-muted rounded-lg border border-paper-line bg-white/80 px-3 py-2">
              Simulated prices until you set{' '}
              <code className="text-paper-ink">MARKETSTACK_ACCESS_KEY</code> on the API.
            </p>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-bold text-paper-ink tracking-tight uppercase">{quote.ticker}</h1>
                <div
                  className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {(displayChangePercent * 100).toFixed(2)}%
                </div>
              </div>
              <p className="text-xl text-paper-muted">{quote.name || 'Company'}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-paper-ink">${displayPrice.toFixed(2)}</p>
              <p className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}
                {displayChange.toFixed(2)} vs prior close
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="min-h-[400px] border-paper-line/60 overflow-hidden">
                <CardHeader className="border-b border-paper-line bg-paper-50">
                  <h2 className="text-sm font-semibold text-paper-ink">Price history (daily)</h2>
                </CardHeader>
                <CardContent className="p-0 pt-2">
                  <StockPriceChart ticker={quote.ticker} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Open"
                  value={dayOpen != null ? `$${dayOpen.toFixed(2)}` : `~$${(displayPrice * 0.99).toFixed(2)}`}
                />
                <StatCard
                  label="High"
                  value={dayHigh != null ? `$${dayHigh.toFixed(2)}` : `~$${(displayPrice * 1.02).toFixed(2)}`}
                />
                <StatCard
                  label="Low"
                  value={dayLow != null ? `$${dayLow.toFixed(2)}` : `~$${(displayPrice * 0.98).toFixed(2)}`}
                />
                <StatCard label="Last update" value={new Date(quote.timestamp).toLocaleString()} />
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border-paper-line/60">
                <CardHeader>
                  <h3 className="font-bold text-paper-ink flex items-center gap-2">
                    <Star size={18} className={onWatchlist ? 'fill-amber-500 text-amber-600' : ''} />
                    Watchlist
                  </h3>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <p className="text-sm text-paper-muted">
                    {onWatchlist
                      ? `${quote.ticker} is on your watchlist.`
                      : `Save ${quote.ticker} to revisit from Discover.`}
                  </p>
                  <Button
                    variant={onWatchlist ? 'outline' : 'primary'}
                    className="w-full"
                    disabled={onWatchlist === null}
                    onClick={() => void toggleWatchlist()}
                  >
                    {onWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                  </Button>
                  <Link
                    href="/discover#watchlist"
                    className="block text-center text-xs text-paper-muted hover:text-paper-ink"
                  >
                    View all saved tickers
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-paper-line/60">
                <CardHeader>
                  <h3 className="font-bold text-paper-ink flex items-center gap-2">
                    <Bell size={18} />
                    Price alert
                  </h3>
                </CardHeader>
                <CardContent className="p-6">
                  <CreateAlertForm ticker={quote.ticker} currentPrice={displayPrice} />
                  <Link
                    href="/alerts"
                    className="block text-center text-xs text-paper-muted hover:text-paper-ink mt-3"
                  >
                    View all alerts
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-paper-line/80 shadow-md overflow-hidden">
                <CardHeader className="bg-paper-50 border-b border-paper-line">
                  <h3 className="font-bold text-paper-ink flex items-center gap-2">
                    <DollarSign size={18} />
                    Trade {quote.ticker}
                  </h3>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-paper-muted">
                    Preview and execute a server-priced paper trade from your cash balance.
                  </p>
                  <Button className="w-full py-6 text-lg font-bold shadow-sm" onClick={() => setIsTradeModalOpen(true)}>
                    Trade Now
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-paper-line/60">
                <CardHeader>
                  <h3 className="font-bold text-paper-ink flex items-center gap-2">
                    <Briefcase size={18} />
                    Your Holdings
                  </h3>
                </CardHeader>
                <CardContent className="p-6">
                  {holdingsQty === null ? (
                    <p className="text-center text-sm text-paper-muted">Loading holdings…</p>
                  ) : parseFloat(holdingsQty) > 0 ? (
                    <p className="text-center text-sm text-paper-ink">
                      You own <span className="font-bold">{holdingsQty}</span> shares of {quote.ticker}.
                    </p>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-paper-muted italic">
                        You don&apos;t own any shares of {quote.ticker} yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} ticker={quote.ticker} />
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-paper-line/50 shadow-sm">
      <p className="text-xs font-bold text-paper-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-paper-ink">{value}</p>
    </div>
  );
}
