'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { marketApi, type MarketQuote } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, DollarSign, BarChart3, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { TradeModal } from '@/components/discover/TradeModal';
import { useMarketData } from '@/hooks/useMarketData';

export default function StockDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const { prices, subscribe, unsubscribe } = useMarketData();
  const liveQuote = prices[ticker.toUpperCase()];

  useEffect(() => {
    subscribe([ticker.toUpperCase()]);
    return () => unsubscribe([ticker.toUpperCase()]);
  }, [ticker, subscribe, unsubscribe]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const data = await marketApi.getQuote(ticker);
        setQuote(data);
      } catch (error) {
        console.error('Failed to fetch quote:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchQuote();
    }
  }, [user, ticker]);

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
        <p className="text-paper-muted text-sm">Stock not found.</p>
        <Button onClick={() => router.back()} variant="outline">Go Back</Button>
      </div>
    );
  }

  const displayPrice = liveQuote?.price ?? quote.price;
  const displayChange = liveQuote?.change ?? quote.change;
  const displayChangePercent = liveQuote?.changePercent ?? quote.changePercent;
  const isPositive = displayChangePercent >= 0;

  return (
    <div className="flex min-h-screen bg-paper-100">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-8 pb-24">
          {/* Navigation */}
          <Link 
            href="/discover" 
            className="inline-flex items-center text-sm text-paper-muted hover:text-paper-ink transition-colors"
          >
            <ChevronLeft size={16} className="mr-1" />
            Back to Discover
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-bold text-paper-ink tracking-tight uppercase">{quote.ticker}</h1>
                <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isPositive ? '+' : ''}{(displayChangePercent * 100).toFixed(2)}%
                </div>
              </div>
              <p className="text-xl text-paper-muted">{quote.name || 'Company Name'}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-paper-ink">${displayPrice.toFixed(2)}</p>
              <p className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{displayChange.toFixed(2)} today
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="h-[400px] flex items-center justify-center border-paper-line/60">
                <div className="text-center space-y-2">
                  <BarChart3 size={48} className="mx-auto text-paper-muted/30" />
                  <p className="text-paper-muted text-sm font-medium italic">Interactive chart coming soon</p>
                </div>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Open" value={`$${(displayPrice * 0.99).toFixed(2)}`} />
                <StatCard label="High" value={`$${(displayPrice * 1.02).toFixed(2)}`} />
                <StatCard label="Low" value={`$${(displayPrice * 0.98).toFixed(2)}`} />
                <StatCard label="Volume" value="1.2M" />
                <StatCard label="Mkt Cap" value="2.4T" />
                <StatCard label="P/E Ratio" value="32.4" />
                <StatCard label="Div Yield" value="1.2%" />
                <StatCard label="52W High" value={`$${(displayPrice * 1.15).toFixed(2)}`} />
              </div>
            </div>

            {/* Side Panel: Actions & Holdings */}
            <div className="space-y-6">
              <Card className="border-paper-line/80 shadow-md overflow-hidden">
                <CardHeader className="bg-paper-50 border-b border-paper-line">
                  <h3 className="font-bold text-paper-ink flex items-center gap-2">
                    <DollarSign size={18} />
                    Trade {quote.ticker}
                  </h3>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-paper-muted">
                    Execute a paper trade for this stock using your current balance.
                  </p>
                  <Button 
                    className="w-full py-6 text-lg font-bold shadow-sm" 
                    onClick={() => setIsTradeModalOpen(true)}
                  >
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
                  <div className="text-center py-4">
                    <p className="text-sm text-paper-muted italic">You don't own any shares of {quote.ticker} yet.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <TradeModal 
          isOpen={isTradeModalOpen} 
          onClose={() => setIsTradeModalOpen(false)} 
          ticker={quote.ticker} 
        />
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
