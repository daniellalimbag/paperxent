import { useState, useEffect, useRef, useCallback } from 'react';
import { getDefaultWsPricesUrl } from '@/lib/public-env';

export interface PriceData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseMarketDataOptions {
  /** WebSocket server URL. Defaults to `NEXT_PUBLIC_WS_URL` or API host + `/ws/prices` */
  wsUrl?: string;
  /** Base reconnect delay in ms (doubles each retry, capped at maxReconnectInterval). Default: 1000 */
  reconnectInterval?: number;
  /** Maximum reconnect delay in ms. Default: 30000 */
  maxReconnectInterval?: number;
  /** Whether the hook should connect at all. Default: true */
  enabled?: boolean;
}

interface UseMarketDataReturn {
  /** Current price data keyed by ticker symbol */
  prices: Record<string, PriceData>;
  /** Granular connection status */
  status: ConnectionStatus;
  /** True only when status === 'connected' */
  isConnected: boolean;
  /** Last error message, or null */
  error: string | null;
  /** Subscribe to one or more tickers */
  subscribe: (tickers: string[]) => void;
  /** Unsubscribe from one or more tickers (also removes their price data) */
  unsubscribe: (tickers: string[]) => void;
  /** Select a single ticker's data without causing re-renders for other tickers */
  getPrice: (ticker: string) => PriceData | undefined;
  /** Imperatively trigger a reconnect (e.g. after user-initiated recovery) */
  reconnect: () => void;
}

// Constants

const DEFAULT_RECONNECT_INTERVAL = 1000;
const DEFAULT_MAX_RECONNECT_INTERVAL = 30_000;

/** Tick shape in `price_ticks` / `price_snapshot` WebSocket payloads from the API */
interface WsPriceTickMessage {
  ticker: string;
  price: string | number;
  change?: string | number;
  changePercent?: string | number;
  timestamp?: string;
}

function parseWsPriceTicks(raw: unknown): WsPriceTickMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is WsPriceTickMessage => {
    if (typeof item !== 'object' || item === null || !('ticker' in item)) {
      return false;
    }
    const row = item as { ticker: unknown };
    return typeof row.ticker === 'string';
  });
}

// Hook

export function useMarketData(
  options: UseMarketDataOptions = {}
): UseMarketDataReturn {
  const {
    wsUrl,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectInterval = DEFAULT_MAX_RECONNECT_INTERVAL,
    enabled = true,
  } = options;

  // State
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Refs

  /** Mirror of prices for synchronous reads (avoids stale closures in getPrice) */
  const pricesRef = useRef<Record<string, PriceData>>({});

  /** Live WebSocket instance */
  const wsRef = useRef<WebSocket | null>(null);

  /** Pending reconnect timer */
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Tracks which tickers are currently subscribed, survives reconnects */
  const subscribedRef = useRef<Set<string>>(new Set());

  /** Current retry count for exponential backoff */
  const retryCountRef = useRef(0);

  /** Stable refs for options so closures always read the latest value */
  const enabledRef = useRef(enabled);
  const reconnectIntervalRef = useRef(reconnectInterval);
  const maxReconnectIntervalRef = useRef(maxReconnectInterval);
  const wsUrlRef = useRef(wsUrl);

  // Keep option refs in sync without recreating callbacks
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { reconnectIntervalRef.current = reconnectInterval; }, [reconnectInterval]);
  useEffect(() => { maxReconnectIntervalRef.current = maxReconnectInterval; }, [maxReconnectInterval]);
  useEffect(() => { wsUrlRef.current = wsUrl; }, [wsUrl]);

  //  Helpers

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();
    if (!enabledRef.current) return;

    const delay = Math.min(
      reconnectIntervalRef.current * 2 ** retryCountRef.current,
      maxReconnectIntervalRef.current
    );
    retryCountRef.current += 1;

    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current();
    }, delay);
  }, [clearReconnectTimer]);

  // Core connect logic (stored in a ref so it can self-reference)
  const connect = useCallback(() => {
    if (!enabledRef.current) return;

    // Don't open a second socket if one is already live
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const url =
        wsUrlRef.current ||
        (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WS_URL) ||
        getDefaultWsPricesUrl();

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setError(null);
        retryCountRef.current = 0; // Reset backoff on successful connection

        // Re-subscribe to all tickers that were active before the reconnect
        if (subscribedRef.current.size > 0) {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              tickers: Array.from(subscribedRef.current),
            })
          );
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.type === 'price_update') {
            const update: PriceData = {
              ticker: data.ticker,
              price: data.price,
              change: data.change,
              changePercent: data.changePercent,
              timestamp: data.timestamp ?? Date.now(),
            };

            // Write to ref first for synchronous reads
            pricesRef.current = {
              ...pricesRef.current,
              [data.ticker]: update,
            };

            // Only update state for subscribed tickers (guard against ghost messages)
            if (subscribedRef.current.has(data.ticker)) {
              setPrices((prev) => ({ ...prev, [data.ticker]: update }));
            }
          } else if (data.type === 'price_ticks' || data.type === 'price_snapshot') {
            const ticks = parseWsPriceTicks(data.data);
            const newPrices = { ...pricesRef.current };
            let hasChanges = false;

            ticks.forEach((tick) => {
              const update: PriceData = {
                ticker: tick.ticker,
                price: Number(tick.price),
                change: Number(tick.change ?? 0),
                changePercent: Number(tick.changePercent ?? 0),
                timestamp: tick.timestamp ? new Date(tick.timestamp).getTime() : Date.now(),
              };

              newPrices[tick.ticker] = update;
              hasChanges = true;
            });

            if (hasChanges) {
              pricesRef.current = newPrices;
              setPrices((prev) => {
                const next = { ...prev };
                ticks.forEach((tick) => {
                  const row = newPrices[tick.ticker];
                  if (row !== undefined && subscribedRef.current.has(tick.ticker)) {
                    next[tick.ticker] = row;
                  }
                });
                return next;
              });
            }
          }
        } catch (err) {
          console.error('[useMarketData] Failed to parse message:', err);
        }
      };

      ws.onerror = () => {
        // onerror is always followed by onclose; let onclose drive reconnect logic
        setError('WebSocket connection error');
        setStatus('error');
      };

      ws.onclose = (event: CloseEvent) => {
        wsRef.current = null;
        setStatus('disconnected');

        // 1000 = normal closure; don't reconnect on intentional disconnect
        if (event.code !== 1000 && enabledRef.current) {
          scheduleReconnect();
        }
      };
    } catch (err) {
      console.error('[useMarketData] Failed to construct WebSocket:', err);
      setError('Failed to connect');
      setStatus('error');
      scheduleReconnect();
    }
  }, [scheduleReconnect]);

  /** Stable ref so setTimeout callbacks always call the latest connect */
  const connectRef = useRef(connect);
  useEffect(() => { connectRef.current = connect; }, [connect]);

  //  Public API

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      // Use code 1000 so onclose knows this was intentional
      wsRef.current.close(1000, 'Intentional disconnect');
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimer]);

  const reconnect = useCallback(() => {
    disconnect();
    retryCountRef.current = 0;
    connect();
  }, [disconnect, connect]);

  const subscribe = useCallback((tickers: string[]) => {
    const newTickers = tickers.filter((t) => !subscribedRef.current.has(t));
    if (newTickers.length === 0) return;

    newTickers.forEach((t) => subscribedRef.current.add(t));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'subscribe', tickers: newTickers })
      );
    }
    // If not yet open, onopen will re-subscribe the full set automatically
  }, []);

  const unsubscribe = useCallback((tickers: string[]) => {
    tickers.forEach((t) => subscribedRef.current.delete(t));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'unsubscribe', tickers })
      );
    }

    // Remove from both the ref and state
    tickers.forEach((t) => {
      delete pricesRef.current[t];
    });
    setPrices((prev) => {
      const next = { ...prev };
      tickers.forEach((t) => delete next[t]);
      return next;
    });
  }, []);

  /**
   * Read a single ticker synchronously from the ref.
   * Components that only need one ticker should prefer this over `prices`
   * to avoid re-rendering when unrelated tickers update.
   */
  const getPrice = useCallback(
    (ticker: string): PriceData | undefined => pricesRef.current[ticker],
    []
  );

  // Lifecycle

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
    // Run only on mount / when enabled flips (connect is stable via connectRef)
  }, [enabled]);

  return {
    prices,
    status,
    isConnected: status === 'connected',
    error,
    subscribe,
    unsubscribe,
    getPrice,
    reconnect,
  };
}