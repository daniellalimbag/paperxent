'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi, ApiError } from '@/lib/api-client';
import type { AnalyticsRange, PortfolioAnalyticsPayload } from '@paperxent/shared-types';

const PIE_COLORS = ['#7c8b6f', '#b9826a', '#4f6045', '#6b7a5f', '#7b4d3d', '#e6dcc7', '#27231d'];

const CHART_THEME = {
  fg: '#27231d',
  muted: '#6f6758',
  grid: '#e6dcc7',
  line: '#4f6045',
  barPos: '#7c8b6f',
  barNeg: '#b91c1c',
  tooltipBg: '#ffffff',
  tooltipBorder: '#d8cdb8',
};

function fmtUsd(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export default function PortfolioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<PortfolioAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await analyticsApi.get(user.id, range);
      setData(payload);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, range]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    void load();
  }, [user?.id, load]);

  const lineData = useMemo(() => {
    if (!data) return [];
    return data.value_over_time.map((p) => ({
      date: p.date,
      label: p.date.slice(5),
      total: parseFloat(p.total_account_value),
      isLive: p.is_live,
    }));
  }, [data]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return data.allocation
      .map((a) => ({
        name: a.ticker,
        value: parseFloat(a.market_value),
        percent: parseFloat(a.percent),
      }))
      .filter((p) => Number.isFinite(p.value) && p.value > 1e-8);
  }, [data]);

  const barData = useMemo(() => {
    if (!data) return [];
    return data.per_asset_roi.map((r) => ({
      ticker: r.ticker,
      roiPct: parseFloat(r.roi) * 100,
      pnl: parseFloat(r.unrealized_pnl),
    }));
  }, [data]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100">
        <p className="text-paper-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper-100 text-paper-ink">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-paper-ink">Portfolio analytics</h1>
              <p className="text-sm text-paper-muted mt-1">
                Snapshots roll up nightly (UTC). Current allocation and ROI use live valuation.
                {data?.valued_at && (
                  <span className="block mt-1 text-xs">Live as of {new Date(data.valued_at).toLocaleString()}</span>
                )}
              </p>
            </div>
            <div className="flex rounded-lg border border-paper-line overflow-hidden bg-white shadow-sm">
              {(['7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    range === r
                      ? 'bg-sage-600 text-white'
                      : 'text-paper-muted hover:bg-paper-50'
                  }`}
                >
                  {r === '7d' ? '7D' : r === '30d' ? '30D' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-paper-muted text-sm">Loading charts…</p>
          ) : data ? (
            <div className="space-y-8">
              <section className="rounded-xl border border-paper-line bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-paper-ink mb-4">Total account value</h2>
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                      <XAxis dataKey="label" tick={{ fill: CHART_THEME.muted, fontSize: 11 }} />
                      <YAxis
                        tick={{ fill: CHART_THEME.muted, fontSize: 11 }}
                        tickFormatter={(v) =>
                          Number(v).toLocaleString('en-US', { notation: 'compact', compactDisplay: 'short' })
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: CHART_THEME.tooltipBg,
                          border: `1px solid ${CHART_THEME.tooltipBorder}`,
                          color: CHART_THEME.fg,
                        }}
                        formatter={(value: number) => [fmtUsd(value), 'Total']}
                        labelFormatter={(_, payload) => {
                          const row = payload?.[0]?.payload as { date?: string; isLive?: boolean } | undefined;
                          if (!row?.date) return '';
                          return `${row.date}${row.isLive ? ' (live)' : ''}`;
                        }}
                      />
                      <Line type="monotone" dataKey="total" stroke={CHART_THEME.line} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="rounded-xl border border-paper-line bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-semibold text-paper-ink mb-4">Allocation</h2>
                  <div className="h-[320px] w-full min-w-0 flex items-center justify-center">
                    {pieData.length === 0 ? (
                      <p className="text-sm text-paper-muted">No allocation to display.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            label={(props: { name: string; percent: number }) =>
                              `${props.name} (${(props.percent * 100).toFixed(0)}%)`
                            }
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: CHART_THEME.tooltipBg,
                              border: `1px solid ${CHART_THEME.tooltipBorder}`,
                              color: CHART_THEME.fg,
                            }}
                            formatter={(value: number, _n, item) => [
                              fmtUsd(value),
                              `${(item.payload as { percent?: number }).percent?.toFixed(1) ?? ''}% of portfolio`,
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-paper-line bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-semibold text-paper-ink mb-4">Unrealized ROI by holding</h2>
                  <div className="h-[320px] w-full min-w-0 flex items-center justify-center">
                    {barData.length === 0 ? (
                      <p className="text-sm text-paper-muted">No open positions.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                          <XAxis
                            dataKey="ticker"
                            tick={{ fill: CHART_THEME.muted, fontSize: 11 }}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            tick={{ fill: CHART_THEME.muted, fontSize: 11 }}
                            tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                            label={{
                              value: 'ROI %',
                              angle: -90,
                              position: 'insideLeft',
                              fill: CHART_THEME.muted,
                              fontSize: 11,
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: CHART_THEME.tooltipBg,
                              border: `1px solid ${CHART_THEME.tooltipBorder}`,
                              color: CHART_THEME.fg,
                            }}
                            formatter={(value: number, _name, item) => {
                              const pnl = (item.payload as { pnl?: number }).pnl;
                              return [`${value.toFixed(2)}%`, pnl !== undefined ? `P&L ${fmtUsd(pnl)}` : 'ROI'];
                            }}
                          />
                          <Bar dataKey="roiPct" radius={[4, 4, 0, 0]}>
                            {barData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.roiPct >= 0 ? CHART_THEME.barPos : CHART_THEME.barNeg}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
