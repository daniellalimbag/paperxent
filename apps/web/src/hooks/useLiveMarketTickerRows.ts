import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { marketApi, type MarketQuote } from '@/lib/api-client';

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export type TickerRow = {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  /** ms since epoch when quote was produced (REST) or tick arrived (sim WS) */
  timestampMs: number | null;
};

/**
 * When Marketstack is enabled on the API, uses REST batch quotes on an interval instead of
 * the Redis random-walk WebSocket. Otherwise subscribes to the sim price feed.
 */
export function useLiveMarketTickerRows(tickers: readonly string[], pollMs = 60_000) {
  const tickerKey = useMemo(() => [...tickers].map((t) => t.toUpperCase()).sort().join(','), [tickers]);
  const list = useMemo(() => tickerKey.split(',').filter(Boolean), [tickerKey]);

  const [mode, setMode] = useState<'loading' | 'live' | 'sim'>('loading');
  const [restByTicker, setRestByTicker] = useState<Record<string, MarketQuote>>({});

  const wsEnabled = mode === 'sim';
  const { prices, subscribe, unsubscribe, isConnected, status } = useMarketData({ enabled: wsEnabled });

  useEffect(() => {
    let cancelled = false;
    void marketApi
      .getFeatures()
      .then((f) => {
        if (!cancelled) setMode(f.marketstackEnabled ? 'live' : 'sim');
      })
      .catch(() => {
        if (!cancelled) setMode('sim');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'live' || list.length === 0) return;
    let cancelled = false;
    const load = async () => {
      try {
        const qs = await marketApi.getQuotesBatch(list);
        if (cancelled) return;
        const map: Record<string, MarketQuote> = {};
        for (const q of qs) {
          map[q.ticker.toUpperCase()] = q;
        }
        setRestByTicker(map);
      } catch {
        if (!cancelled) setRestByTicker({});
      }
    };
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [mode, list, pollMs]);

  useEffect(() => {
    if (!wsEnabled || list.length === 0) return;
    subscribe(list);
    return () => unsubscribe(list);
  }, [wsEnabled, subscribe, unsubscribe, list]);

  const row = useCallback(
    (ticker: string): TickerRow => {
      const t = ticker.toUpperCase();
      const q = mode === 'live' ? restByTicker[t] : undefined;
      const ws = mode === 'sim' ? prices[t] : undefined;

      if (mode === 'live' && q != null) {
        const ts = Date.parse(q.timestamp);
        return {
          price: num(q.price),
          change: num(q.change),
          changePercent: num(q.changePercent, 0),
          timestampMs: Number.isFinite(ts) ? ts : null,
        };
      }
      if (mode === 'sim' && ws != null) {
        return {
          price: ws.price,
          change: ws.change,
          changePercent: ws.changePercent,
          timestampMs: ws.timestamp,
        };
      }
      return { price: null, change: null, changePercent: null, timestampMs: null };
    },
    [mode, restByTicker, prices],
  );

  return { mode, row, wsConnected: isConnected, wsStatus: status };
}
