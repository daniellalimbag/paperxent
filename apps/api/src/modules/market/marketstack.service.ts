/**
 * Optional Marketstack integration for US/global equity EOD quotes and daily history.
 * Sign up at https://marketstack.com/ and set MARKETSTACK_ACCESS_KEY.
 *
 * Uses API v1: https://api.marketstack.com/v1/
 */

const MARKETSTACK_BASE = 'https://api.marketstack.com/v1';

const TIMEOUT_QUOTE_MS = 35_000;
const TIMEOUT_HISTORY_MS = 90_000;

export function isMarketstackEnabled(): boolean {
  return Boolean(process.env.MARKETSTACK_ACCESS_KEY?.trim());
}

function accessKey(): string {
  const k = process.env.MARKETSTACK_ACCESS_KEY?.trim();
  if (!k) throw new Error('MARKETSTACK_ACCESS_KEY is not configured');
  return k;
}

function requestInit(timeoutMs: number): RequestInit {
  return {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PaperXent/1.0',
    },
    signal: AbortSignal.timeout(timeoutMs),
  };
}

interface MarketstackErrorBody {
  error?: { code?: string; message?: string };
}

/** One row from `/eod`, `/eod/latest`, or paginated EOD history. */
export interface MarketstackEodRow {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adj_open?: number;
  adj_high?: number;
  adj_low?: number;
  adj_close?: number;
  adj_volume?: number;
  split_factor?: number;
  dividend?: number;
  symbol: string;
  exchange?: string;
  date: string;
}

interface MarketstackListResponse<T> {
  data?: T[];
  pagination?: { limit: number; offset: number; count: number; total: number };
}

async function readMarketstackJson<T>(res: Response): Promise<T & MarketstackErrorBody> {
  const text = await res.text();
  let json: T & MarketstackErrorBody;
  try {
    json = JSON.parse(text) as T & MarketstackErrorBody;
  } catch {
    throw new Error(`Marketstack returned non-JSON (HTTP ${res.status}): ${text.slice(0, 240)}`);
  }
  if (!res.ok) {
    const msg = json.error?.message ?? json.error?.code ?? text.slice(0, 240);
    throw new Error(`Marketstack HTTP ${res.status}: ${msg}`);
  }
  if (json.error?.message) {
    throw new Error(`Marketstack error: ${json.error.message}`);
  }
  return json;
}

/** Latest EOD row per symbol (one HTTP call for up to 100 symbols). */
export async function fetchMarketstackEodLatest(symbols: string[]): Promise<MarketstackEodRow[]> {
  if (!isMarketstackEnabled()) return [];
  const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (normalized.length === 0) return [];

  const out: MarketstackEodRow[] = [];
  const chunkSize = 100;
  for (let i = 0; i < normalized.length; i += chunkSize) {
    const chunk = normalized.slice(i, i + chunkSize);
    const qs = new URLSearchParams({
      access_key: accessKey(),
      symbols: chunk.join(','),
    });
    const url = `${MARKETSTACK_BASE}/eod/latest?${qs.toString()}`;
    let res: Response;
    try {
      res = await fetch(url, requestInit(TIMEOUT_QUOTE_MS));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Network error calling Marketstack eod/latest: ${msg}`);
    }
    const body = await readMarketstackJson<MarketstackListResponse<MarketstackEodRow>>(res);
    const rows = body.data ?? [];
    out.push(...rows);
  }
  return out;
}

export interface MarketstackTickerSearchRow {
  name: string;
  symbol: string;
  stock_exchange?: { mic?: string; name?: string; country?: string };
}

export async function fetchMarketstackTickerSearch(query: string): Promise<MarketstackTickerSearchRow[]> {
  if (!isMarketstackEnabled()) return [];
  const q = query.trim();
  if (!q) return [];
  const qs = new URLSearchParams({
    access_key: accessKey(),
    search: q,
    limit: '20',
  });
  const url = `${MARKETSTACK_BASE}/tickers?${qs.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, requestInit(TIMEOUT_QUOTE_MS));
  } catch {
    return [];
  }
  try {
    const body = await readMarketstackJson<MarketstackListResponse<MarketstackTickerSearchRow>>(res);
    return body.data ?? [];
  } catch {
    return [];
  }
}

/** Single-ticker metadata (company name). */
export async function fetchMarketstackTickerInfo(symbol: string): Promise<{ name?: string } | null> {
  if (!isMarketstackEnabled()) return null;
  const sym = symbol.trim().toUpperCase();
  const qs = new URLSearchParams({ access_key: accessKey() });
  const url = `${MARKETSTACK_BASE}/tickers/${encodeURIComponent(sym)}?${qs.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, requestInit(TIMEOUT_QUOTE_MS));
  } catch {
    return null;
  }
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { data?: { name?: string; symbol?: string } } & MarketstackErrorBody;
    if (!res.ok) return null;
    const d = json.data;
    if (!d || typeof d !== 'object') return null;
    if (typeof d.name === 'string' && d.name.length > 0) {
      return { name: d.name };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Paginated EOD history for charts (`resolution` is treated as daily EOD bars).
 */
export async function fetchMarketstackEodHistory(
  symbol: string,
  fromSec: number,
  toSec: number,
): Promise<MarketstackEodRow[]> {
  if (!isMarketstackEnabled()) {
    throw new Error('MARKETSTACK_ACCESS_KEY is not configured on this API process');
  }
  const sym = symbol.trim().toUpperCase();
  const dateFrom = new Date(fromSec * 1000).toISOString().slice(0, 10);
  const dateTo = new Date(toSec * 1000).toISOString().slice(0, 10);

  const all: MarketstackEodRow[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const qs = new URLSearchParams({
      access_key: accessKey(),
      symbols: sym,
      date_from: dateFrom,
      date_to: dateTo,
      sort: 'ASC',
      limit: String(limit),
      offset: String(offset),
    });
    const url = `${MARKETSTACK_BASE}/eod?${qs.toString()}`;
    let res: Response;
    try {
      res = await fetch(url, requestInit(TIMEOUT_HISTORY_MS));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Network error calling Marketstack eod: ${msg}`);
    }
    const body = await readMarketstackJson<MarketstackListResponse<MarketstackEodRow>>(res);
    const batch = body.data ?? [];
    all.push(...batch);
    const total = body.pagination?.total ?? all.length;
    if (batch.length < limit || all.length >= total) break;
    offset += limit;
  }

  return all;
}
