import type { GetQuoteInput, MarketQuote, DiscoverResponse, MarketCandles } from './market.types.js';
import { MarketRepository } from './market.repository.js';
import { MARKET_METADATA, type MarketMetadata } from './market-metadata.js';
import {
  isMarketstackEnabled,
  fetchMarketstackEodLatest,
  fetchMarketstackTickerSearch,
  fetchMarketstackTickerInfo,
  fetchMarketstackEodHistory,
  type MarketstackEodRow,
} from './marketstack.service.js';
import { logger } from '../../shared/logging/logger.js';
import { AppError } from '../../shared/errors/app-error.js';

/** Throttle parallel Marketstack ticker-info calls when resolving names. */
const MARKETSTACK_INFO_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      results[i] = await mapper(items[i]!);
    }
  };
  const workers = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function eodRowToMarketQuote(ticker: string, row: MarketstackEodRow, name?: string): MarketQuote | null {
  const close = Number(row.adj_close ?? row.close);
  if (!Number.isFinite(close) || close <= 0) {
    return null;
  }
  const sessionOpenRaw = row.adj_open ?? row.open;
  const sessionOpen = Number(sessionOpenRaw);
  const openForChange = Number.isFinite(sessionOpen) && sessionOpen > 0 ? sessionOpen : close;
  const change = close - openForChange;
  const changePercent = openForChange === 0 ? 0 : change / openForChange;
  const ts = Date.parse(row.date);
  const timestamp = Number.isFinite(ts) ? new Date(ts).toISOString() : new Date().toISOString();

  const out: MarketQuote = {
    ticker: ticker.trim().toUpperCase(),
    price: close.toFixed(4),
    timestamp,
    previousPrice: openForChange.toFixed(4),
    change: change.toFixed(4),
    changePercent: changePercent.toFixed(8),
    source: 'live',
  };
  const hi = row.adj_high ?? row.high;
  const lo = row.adj_low ?? row.low;
  const op = row.adj_open ?? row.open;
  if (typeof op === 'number' && Number.isFinite(op)) out.open = op.toFixed(4);
  if (typeof hi === 'number' && Number.isFinite(hi)) out.high = hi.toFixed(4);
  if (typeof lo === 'number' && Number.isFinite(lo)) out.low = lo.toFixed(4);
  if (name !== undefined && name.length > 0) {
    out.name = name;
  }
  return out;
}

export class MarketService {
  constructor(private readonly marketRepository = new MarketRepository()) {}

  /**
   * Latest quote: Marketstack EOD latest when MARKETSTACK_ACCESS_KEY is set (cached in Redis),
   * otherwise Redis simulated feed only.
   */
  async getQuote(input: GetQuoteInput): Promise<MarketQuote | null> {
    const ticker = input.ticker.trim().toUpperCase();

    if (isMarketstackEnabled()) {
      const live = await this.fetchAndCacheLiveQuote(ticker);
      if (live) return live;
    }

    const quote = await this.marketRepository.findQuote({ ticker });
    if (!quote) return null;

    const metadata = MARKET_METADATA.find((m) => m.ticker === quote.ticker);
    return {
      ...quote,
      name: metadata?.name,
      source: 'simulated',
    };
  }

  private async redisQuoteAsSimulated(ticker: string): Promise<MarketQuote | null> {
    const cached = await this.marketRepository.findQuote({ ticker });
    if (!cached) return null;
    const metadata = MARKET_METADATA.find((m) => m.ticker === cached.ticker);
    return {
      ...cached,
      name: metadata?.name ?? cached.name,
      source: 'simulated',
    };
  }

  private async resolveNames(tickers: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    for (const t of tickers) {
      const meta = MARKET_METADATA.find((m) => m.ticker === t);
      if (meta?.name) names.set(t, meta.name);
    }
    const need = tickers.filter((t) => !names.has(t));
    await mapWithConcurrency(need, MARKETSTACK_INFO_CONCURRENCY, async (t) => {
      const info = await fetchMarketstackTickerInfo(t);
      if (info?.name) names.set(t, info.name);
    });
    return names;
  }

  private async fetchAndCacheLiveQuote(ticker: string): Promise<MarketQuote | null> {
    try {
      const rows = await fetchMarketstackEodLatest([ticker]);
      const row =
        rows.find((r) => String(r.symbol).toUpperCase() === ticker.toUpperCase()) ?? rows[0];
      if (!row) {
        const fallback = await this.redisQuoteAsSimulated(ticker);
        if (fallback) {
          logger.warn('Marketstack eod/latest empty; using Redis quote for ticker', { ticker });
        }
        return fallback;
      }

      let name: string | undefined = MARKET_METADATA.find((m) => m.ticker === ticker)?.name;
      if (!name) {
        const info = await fetchMarketstackTickerInfo(ticker);
        name = info?.name ?? undefined;
      }

      const quote = eodRowToMarketQuote(ticker, row, name);
      if (!quote) {
        const fallback = await this.redisQuoteAsSimulated(ticker);
        if (fallback) {
          logger.warn('Marketstack row rejected (invalid close); using Redis quote for ticker', {
            ticker,
          });
        }
        return fallback;
      }

      await this.marketRepository.saveQuote(quote);
      return quote;
    } catch (err) {
      logger.warn('Marketstack quote fetch failed; falling back to cache', {
        ticker,
        error: err instanceof Error ? err.message : String(err),
      });
      return this.redisQuoteAsSimulated(ticker);
    }
  }

  async getQuotes(tickers: string[]): Promise<MarketQuote[]> {
    const normalized = Array.from(
      new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)),
    );
    if (normalized.length === 0) return [];

    if (isMarketstackEnabled()) {
      try {
        const rows = await fetchMarketstackEodLatest(normalized);
        const bySym = new Map(rows.map((r) => [String(r.symbol).toUpperCase(), r]));
        const names = await this.resolveNames(normalized);
        const out: MarketQuote[] = [];

        for (const t of normalized) {
          const row = bySym.get(t);
          if (!row) {
            const fb = await this.redisQuoteAsSimulated(t);
            if (fb) {
              logger.warn('Marketstack eod/latest missing symbol; using Redis quote', { ticker: t });
              out.push(fb);
            }
            continue;
          }
          const nm = names.get(t);
          const quote = eodRowToMarketQuote(t, row, nm);
          if (quote) {
            await this.marketRepository.saveQuote(quote);
            out.push(quote);
          } else {
            const fb = await this.redisQuoteAsSimulated(t);
            if (fb) out.push(fb);
          }
        }
        return out;
      } catch (err) {
        logger.warn('Marketstack batch eod/latest failed; falling back per ticker', {
          error: err instanceof Error ? err.message : String(err),
        });
        const results = await mapWithConcurrency(normalized, MARKETSTACK_INFO_CONCURRENCY, (sym) =>
          this.fetchAndCacheLiveQuote(sym),
        );
        return results.filter((q): q is MarketQuote => q != null);
      }
    }

    const quotesMap = await this.marketRepository.findQuotes(normalized);
    return normalized
      .map((t) => {
        const q = quotesMap.get(t);
        if (!q) return undefined;
        const metadata = MARKET_METADATA.find((m) => m.ticker === q.ticker);
        const merged: MarketQuote = {
          ...q,
          source: 'simulated',
        };
        if (metadata?.name !== undefined) {
          merged.name = metadata.name;
        }
        return merged;
      })
      .filter((q): q is MarketQuote => q !== undefined);
  }

  async searchTickers(query: string): Promise<MarketMetadata[]> {
    const q = query.toLowerCase();
    const local = MARKET_METADATA.filter(
      (m) => m.ticker.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );

    if (!isMarketstackEnabled()) {
      return local.slice(0, 10);
    }

    try {
      const remote = await fetchMarketstackTickerSearch(query.trim());
      const mapped: MarketMetadata[] = remote.slice(0, 15).map((r) => {
        const sym = String(r.symbol ?? '')
          .replace(/^[^:]+:\:/, '')
          .toUpperCase();
        return {
          ticker: sym,
          name: r.name ?? sym,
          category: [],
        };
      });

      const seen = new Set<string>();
      const merged: MarketMetadata[] = [];
      for (const row of [...local, ...mapped]) {
        const t = row.ticker.toUpperCase();
        if (seen.has(t)) continue;
        seen.add(t);
        merged.push({ ...row, ticker: t });
        if (merged.length >= 12) break;
      }
      return merged;
    } catch {
      return local.slice(0, 10);
    }
  }

  async getDiscoverData(): Promise<DiscoverResponse> {
    const allTickers = MARKET_METADATA.map((m) => m.ticker);
    const quotesList = isMarketstackEnabled()
      ? await this.getQuotes(allTickers)
      : Array.from((await this.marketRepository.findQuotes(allTickers)).values()).map((q) => {
          const metadata = MARKET_METADATA.find((m) => m.ticker === q.ticker);
          return { ...q, name: metadata?.name, source: 'simulated' as const };
        });

    const quotesByTicker = new Map(quotesList.map((q) => [q.ticker, q]));

    const getQuotesForTickers = (tickers: string[]): MarketQuote[] =>
      tickers.map((t) => quotesByTicker.get(t)).filter((q): q is MarketQuote => q != null);

    return {
      trending: getQuotesForTickers(['NVDA', 'TSLA', 'AAPL', 'MSFT', 'META', 'GOOGL']),
      movers: [...quotesByTicker.values()]
        .sort(
          (a, b) =>
            Math.abs(Number(b.changePercent ?? 0)) - Math.abs(Number(a.changePercent ?? 0)),
        )
        .slice(0, 10),
      ipos: getQuotesForTickers(['RDDT', 'ALAB', 'ARM', 'KVUE', 'BIRK', 'CART']),
    };
  }

  async getCandles(
    ticker: string,
    resolution: string,
    fromSec: number,
    toSec: number,
  ): Promise<MarketCandles> {
    const sym = ticker.trim().toUpperCase();
    if (!isMarketstackEnabled()) {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message:
          'Live charts require MARKETSTACK_ACCESS_KEY on this API process. Get a key at https://marketstack.com/',
        statusCode: 503,
      });
    }

    let rows: MarketstackEodRow[];
    try {
      rows = await fetchMarketstackEodHistory(sym, fromSec, toSec);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new AppError({
        code: 'BAD_GATEWAY',
        message: detail,
        statusCode: 502,
      });
    }

    if (rows.length === 0) {
      throw new AppError({
        code: 'NOT_FOUND',
        message:
          'Marketstack returned no EOD bars for this symbol and date range. Try another ticker or a shorter range.',
        statusCode: 404,
      });
    }

    const bars = rows.map((row) => {
      const ts = Date.parse(row.date);
      const time = Number.isFinite(ts) ? new Date(ts).toISOString() : new Date(0).toISOString();
      const o = row.adj_open ?? row.open;
      const h = row.adj_high ?? row.high;
      const l = row.adj_low ?? row.low;
      const c = row.adj_close ?? row.close;
      const v = row.adj_volume ?? row.volume;
      return {
        time,
        open: String(o ?? 0),
        high: String(h ?? 0),
        low: String(l ?? 0),
        close: String(c ?? 0),
        volume: String(v ?? 0),
      };
    });

    return { ticker: sym, resolution, bars };
  }
}
