'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { marketApi, ApiError } from '@/lib/api-client';

const CHART = {
  fg: '#27231d',
  muted: '#6f6758',
  grid: '#e6dcc7',
  line: '#4f6045',
};

type Row = { label: string; close: number };

export function StockPriceChart({ ticker }: { ticker: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setHint(null);
      try {
        const candles = await marketApi.getCandles(ticker, { resolution: 'D' });
        if (cancelled) return;
        if (candles === null) {
          setRows([]);
          setHint(
            'The API says live charts are not enabled: it did not find MARKETSTACK_ACCESS_KEY in its environment. Put the key in the **API** .env (repo root `.env` or `apps/api/.env`), restart the API, and ensure Next.js `API_INTERNAL_URL` points at that same API instance.',
          );
          return;
        }
        if (candles.bars.length === 0) {
          setRows([]);
          setHint('No candle rows returned. Try reloading, or pick another symbol.');
          return;
        }
        setRows(
          candles.bars.map((b) => ({
            label: b.time.slice(5, 10),
            close: parseFloat(b.close),
          })),
        );
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          setHint(e.message);
        } else {
          setHint('Could not load chart data.');
        }
        setRows([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (hint && rows.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-paper-muted max-w-md">{hint}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center">
        <p className="text-sm text-paper-muted">Loading chart…</p>
      </div>
    );
  }

  return (
    <div className="h-[360px] w-full min-w-0 px-2 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
          <XAxis dataKey="label" tick={{ fill: CHART.muted, fontSize: 11 }} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: CHART.muted, fontSize: 11 }}
            tickFormatter={(v) =>
              Number(v).toLocaleString('en-US', { notation: 'compact', compactDisplay: 'short' })
            }
            width={56}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #d8cdb8',
              color: CHART.fg,
            }}
            formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, 'Close']}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as Row | undefined;
              return row ? `Date ${row.label}` : '';
            }}
          />
          <Line type="monotone" dataKey="close" stroke={CHART.line} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
