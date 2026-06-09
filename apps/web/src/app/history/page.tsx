'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { transactionsApi, ApiError } from '@/lib/api-client';
import type { TransactionHistoryItem, TradeSide } from '@paperxent/shared-types';
import { toast } from 'sonner';

type TypeFilter = 'ALL' | TradeSide;
type SortKey = 'timestamp' | 'ticker' | 'type' | 'quantity' | 'price' | 'total';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const body = [headers.join(','), ...rows.map((r) => r.map(escapeCsvCell).join(','))].join('\r\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sortRows(items: TransactionHistoryItem[], key: SortKey, dir: SortDir): TransactionHistoryItem[] {
  const m = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (key) {
      case 'timestamp':
        return m * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      case 'ticker':
        return m * a.ticker.localeCompare(b.ticker);
      case 'type':
        return m * a.type.localeCompare(b.type);
      case 'quantity':
        return m * (parseFloat(a.quantity) - parseFloat(b.quantity));
      case 'price':
        return m * (parseFloat(a.price) - parseFloat(b.price));
      case 'total':
        return m * (parseFloat(a.total) - parseFloat(b.total));
      default:
        return 0;
    }
  });
}

function SortChevron({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-paper-muted/40 ml-1">↕</span>;
  return <span className="ml-1 text-sage-700">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [tickerDraft, setTickerDraft] = useState('');
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [appliedTicker, setAppliedTicker] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const [items, setItems] = useState<TransactionHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const listParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      ticker: appliedTicker.trim() || undefined,
      from: appliedFrom.trim() || undefined,
      to: appliedTo.trim() || undefined,
    }),
    [typeFilter, appliedTicker, appliedFrom, appliedTo],
  );

  const fetchFirst = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await transactionsApi.list(user.id, { ...listParams });
      setItems(data.items);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        toast.error(e.message);
      } else {
        setError('Failed to load history');
        toast.error('Failed to load history');
      }
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, listParams]);

  const loadMore = useCallback(async () => {
    if (!user?.id || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await transactionsApi.list(user.id, { ...listParams, cursor: nextCursor });
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error('Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [user?.id, nextCursor, loadingMore, listParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchFirst();
  }, [user?.id, fetchFirst]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) void loadMore();
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  const sorted = useMemo(() => sortRows(items, sortKey, sortDir), [items, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'timestamp' ? 'desc' : 'asc');
    }
  };

  const applyFilters = () => {
    setAppliedTicker(tickerDraft.trim());
    setAppliedFrom(fromDraft.trim());
    setAppliedTo(toDraft.trim());
  };

  const exportCsv = () => {
    if (sorted.length === 0) {
      toast.info('Nothing to export yet.');
      return;
    }
    const headers = ['Date (ISO)', 'Ticker', 'Type', 'Quantity', 'Price', 'Total'];
    const rows = sorted.map((r) => [
      r.timestamp,
      r.ticker,
      r.type,
      r.quantity,
      r.price,
      r.total,
    ]);
    downloadCsv(`paperxent-transactions-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast.success('CSV downloaded');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100">
        <p className="text-paper-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-paper-ink">Transaction history</h1>
              <p className="text-sm text-paper-muted mt-1">Filter, scroll for more, or export loaded rows to CSV.</p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="px-4 py-2 rounded-md border border-paper-line bg-white text-paper-ink text-sm font-medium hover:bg-paper-50 shadow-sm"
            >
              Export CSV
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-paper-muted">Side</span>
            {(['ALL', 'BUY', 'SELL'] as const).map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => setTypeFilter(pill)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  typeFilter === pill
                    ? 'bg-sage-600 text-white'
                    : 'bg-white text-paper-muted border border-paper-line hover:bg-paper-50'
                }`}
              >
                {pill === 'ALL' ? 'All' : pill}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-end bg-white border border-paper-line rounded-lg p-4 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-paper-muted mb-1">Ticker</label>
              <input
                value={tickerDraft}
                onChange={(e) => setTickerDraft(e.target.value)}
                placeholder="e.g. AAPL"
                className="px-3 py-2 border border-paper-line rounded-md text-sm w-36 bg-paper-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-paper-muted mb-1">From (ISO)</label>
              <input
                value={fromDraft}
                onChange={(e) => setFromDraft(e.target.value)}
                placeholder="2025-01-01T00:00:00.000Z"
                className="px-3 py-2 border border-paper-line rounded-md text-sm w-56 bg-paper-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-paper-muted mb-1">To (ISO)</label>
              <input
                value={toDraft}
                onChange={(e) => setToDraft(e.target.value)}
                placeholder="2025-12-31T23:59:59.999Z"
                className="px-3 py-2 border border-paper-line rounded-md text-sm w-56 bg-paper-50"
              />
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="px-4 py-2 rounded-md bg-sage-600 text-white text-sm font-medium hover:bg-sage-700"
            >
              Apply filters
            </button>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          <div className="bg-white border border-paper-line rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-line bg-paper-50">
                    <th className="text-left py-3 px-4">
                      <button type="button" className="font-medium text-paper-ink inline-flex items-center" onClick={() => toggleSort('timestamp')}>
                        Date
                        <SortChevron active={sortKey === 'timestamp'} dir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <button type="button" className="font-medium text-paper-ink inline-flex items-center" onClick={() => toggleSort('ticker')}>
                        Ticker
                        <SortChevron active={sortKey === 'ticker'} dir={sortDir} />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <button type="button" className="font-medium text-paper-ink inline-flex items-center" onClick={() => toggleSort('type')}>
                        Type
                        <SortChevron active={sortKey === 'type'} dir={sortDir} />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4">
                      <button type="button" className="font-medium text-paper-ink inline-flex items-center ml-auto" onClick={() => toggleSort('quantity')}>
                        Qty
                        <SortChevron active={sortKey === 'quantity'} dir={sortDir} />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4">
                      <button type="button" className="font-medium text-paper-ink inline-flex items-center ml-auto" onClick={() => toggleSort('price')}>
                        Price
                        <SortChevron active={sortKey === 'price'} dir={sortDir} />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4">
                      <button type="button" className="font-medium text-paper-ink inline-flex items-center ml-auto" onClick={() => toggleSort('total')}>
                        Total
                        <SortChevron active={sortKey === 'total'} dir={sortDir} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-paper-muted">
                        Loading transactions…
                      </td>
                    </tr>
                  ) : sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-paper-muted">
                        No transactions match these filters.
                      </td>
                    </tr>
                  ) : (
                    sorted.map((row) => (
                      <tr key={row.id} className="border-b border-paper-line hover:bg-paper-50">
                        <td className="py-3 px-4 text-paper-ink whitespace-nowrap">
                          {new Date(row.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-paper-ink">{row.ticker}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">{row.quantity}</td>
                        <td className="py-3 px-4 text-right tabular-nums">${parseFloat(row.price).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-medium">
                          ${parseFloat(row.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div ref={sentinelRef} className="h-4" aria-hidden />
            {loadingMore && <p className="text-center text-xs text-paper-muted py-2">Loading more…</p>}
            {!hasMore && !loading && items.length > 0 && (
              <p className="text-center text-xs text-paper-muted py-2">End of history</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
