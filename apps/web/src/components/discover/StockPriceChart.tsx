'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { marketApi, ApiError } from '@/lib/api-client';

const CHART_THEME = {
  fg: '#27231d',
  muted: '#6f6758',
  grid: '#e6dcc7',
  line: '#4f6045',
  area: '#7c8b6f',
};

type Row = {
  time: string;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const RANGES: { label: string; value: Range; days: number }[] = [
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: '6M', value: '6M', days: 180 },
  { label: '1Y', value: '1Y', days: 365 },
  { label: 'ALL', value: 'ALL', days: 1825 }, // 5 years
];

export function StockPriceChart({ ticker }: { ticker: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [range, setRange] = useState<Range>('3M');
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setHint(null);
      try {
        const selectedRange = RANGES.find((r) => r.value === range) || RANGES[1]!;
        const to = Math.floor(Date.now() / 1000);
        const from = to - selectedRange.days * 24 * 60 * 60;

        const candles = await marketApi.getCandles(ticker, {
          resolution: 'D',
          from,
          to,
        });

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
          setHint('No candle rows returned for this range. Try another ticker or range.');
          return;
        }

        setRows(
          candles.bars.map((b) => ({
            time: b.time,
            label: new Date(b.time).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: range === '1Y' || range === 'ALL' ? '2-digit' : undefined,
            }),
            open: parseFloat(b.open),
            high: parseFloat(b.high),
            low: parseFloat(b.low),
            close: parseFloat(b.close),
            volume: parseFloat(b.volume),
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
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ticker, range]);

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const first = rows[0]!.close;
    const last = rows[rows.length - 1]!.close;
    const change = last - first;
    const pct = (change / first) * 100;
    return { change, pct, isPos: change >= 0 };
  }, [rows]);

  if (hint && rows.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-paper-muted max-w-md">{hint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[400px] space-y-4">
      {/* Header with stats and range selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 pt-2">
        <div>
          {stats && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-paper-ink">
                ${rows[rows.length - 1]?.close.toFixed(2)}
              </span>
              <span
                className={`text-sm font-semibold ${
                  stats.isPos ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stats.isPos ? '+' : ''}
                {stats.change.toFixed(2)} ({stats.pct.toFixed(2)}%)
              </span>
              <span className="text-xs text-paper-muted uppercase tracking-wider">
                {range}
              </span>
            </div>
          )}
        </div>

        <div className="flex bg-paper-100 rounded-lg p-1 border border-paper-line shadow-inner">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                range === r.value
                  ? 'bg-white text-paper-ink shadow-sm ring-1 ring-paper-line'
                  : 'text-paper-muted hover:text-paper-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 h-[320px] w-full min-w-0 px-2 pb-2 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
            <p className="text-xs font-bold text-paper-muted uppercase tracking-widest animate-pulse">
              Updating…
            </p>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_THEME.area} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_THEME.area} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_THEME.muted, fontSize: 10, fontWeight: 600 }}
              axisLine={{ stroke: CHART_THEME.grid }}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: CHART_THEME.muted, fontSize: 10, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                Number(v).toLocaleString('en-US', {
                  notation: 'compact',
                  compactDisplay: 'short',
                })
              }
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: `1px solid ${CHART_THEME.grid}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                color: CHART_THEME.fg,
                fontSize: '12px',
              }}
              itemStyle={{ padding: '2px 0' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
              formatter={(value: any, name: any) => {
                const numValue = Number(value ?? 0);
                if (name === 'close') return [`$${numValue.toFixed(2)}`, 'Close'];
                if (name === 'volume')
                  return [
                    numValue.toLocaleString('en-US', { notation: 'compact' }),
                    'Volume',
                  ];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const row = payload?.[0]?.payload as Row | undefined;
                if (!row) return label;
                return new Date(row.time).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={CHART_THEME.line}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorClose)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

