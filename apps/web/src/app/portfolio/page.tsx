'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
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
  Area,
  AreaChart,
  Line,
} from 'recharts';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi, marketApi, ApiError } from '@/lib/api-client';
import type { AnalyticsRange, PortfolioAnalyticsPayload } from '@paperxent/shared-types';
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, Activity, Target } from 'lucide-react';

const PIE_COLORS = ['#7c8b6f', '#b9826a', '#4f6045', '#6b7a5f', '#7b4d3d', '#e6dcc7', '#27231d'];

const CHART_THEME = {
  fg: '#27231d',
  muted: '#6f6758',
  grid: '#e6dcc7',
  line: '#4f6045',
  lineAlt: '#b9826a',
  barPos: '#7c8b6f',
  barNeg: '#b91c1c',
  tooltipBg: '#ffffff',
  tooltipBorder: '#d8cdb8',
};

function fmtUsd(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function PortfolioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<PortfolioAnalyticsPayload | null>(null);
  const [spyData, setSpyData] = useState<{ date: string; close: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [payload, spyCandles] = await Promise.all([
        analyticsApi.get(user.id, range),
        marketApi.getCandles('SPY', {
          resolution: 'D',
          from: Math.floor(Date.now() / 1000) - (range === '7d' ? 10 : range === '30d' ? 40 : 1825) * 24 * 60 * 60,
        }).catch(() => null),
      ]);

      setData(payload);
      if (spyCandles) {
        setSpyData(spyCandles.bars.map(b => ({
          date: b.time.slice(0, 10),
          close: parseFloat(b.close),
        })));
      }
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

  const combinedData = useMemo(() => {
    if (!data) return [];
    
    const portfolioPoints = data.value_over_time.map((p) => ({
      date: p.date,
      label: p.date.slice(5),
      total: parseFloat(p.total_account_value),
      isLive: p.is_live,
    }));

    if (spyData.length === 0) return portfolioPoints;

    // Normalize both to 100 at the start of the range for comparison
    const firstTotal = portfolioPoints[0]?.total || 1;
    const firstSpy = spyData.find(s => s.date >= (portfolioPoints[0]?.date || ''))?.close || 1;

    return portfolioPoints.map(p => {
      const spyPoint = spyData.find(s => s.date === p.date);
      return {
        ...p,
        portfolioReturn: ((p.total - firstTotal) / firstTotal) * 100,
        spyReturn: spyPoint ? ((spyPoint.close - firstSpy) / firstSpy) * 100 : undefined,
      };
    });
  }, [data, spyData]);

  const summary = useMemo(() => {
    if (!data || combinedData.length === 0) return null;
    const first = combinedData[0]!.total;
    const last = combinedData[combinedData.length - 1]!.total;
    const pnl = last - first;
    const roi = (pnl / (first || 1)) * 100;
    
    const bestAsset = [...data.per_asset_roi].sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi))[0];
    const worstAsset = [...data.per_asset_roi].sort((a, b) => parseFloat(a.roi) - parseFloat(b.roi))[0];

    return {
      totalValue: last,
      pnl,
      roi,
      bestAsset,
      worstAsset,
    };
  }, [data, combinedData]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return data.allocation
      .map((a) => ({
        name: a.ticker,
        value: parseFloat(a.market_value),
        percent: parseFloat(a.percent),
      }))
      .filter((p) => Number.isFinite(p.value) && p.value > 1e-8)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const barData = useMemo(() => {
    if (!data) return [];
    return data.per_asset_roi.map((r) => ({
      ticker: r.ticker,
      roiPct: parseFloat(r.roi) * 100,
      pnl: parseFloat(r.unrealized_pnl),
    })).sort((a, b) => b.roiPct - a.roiPct);
  }, [data]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100">
        <p className="text-paper-muted text-sm font-bold uppercase tracking-widest animate-pulse">Loading…</p>
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
              <h1 className="text-3xl font-bold text-paper-ink tracking-tight">Portfolio Analytics</h1>
              <p className="text-sm text-paper-muted mt-1">
                Performance tracking and allocation breakdown.
                {data?.valued_at && (
                  <span className="block mt-1 text-xs font-medium">Live as of {new Date(data.valued_at).toLocaleString()}</span>
                )}
              </p>
            </div>
            <div className="flex rounded-lg border border-paper-line overflow-hidden bg-white shadow-sm p-1">
              {(['7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-md ${
                    range === r
                      ? 'bg-sage-600 text-white shadow-sm'
                      : 'text-paper-muted hover:text-paper-ink'
                  }`}
                >
                  {r === '7d' ? '7D' : r === '30d' ? '30D' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
               <p className="text-paper-muted text-sm font-bold uppercase tracking-widest animate-pulse">Analyzing portfolio…</p>
            </div>
          ) : data && summary ? (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  label="Total Value"
                  value={fmtUsd(summary.totalValue)}
                  icon={<Activity size={18} />}
                />
                <SummaryCard
                  label={`${range.toUpperCase()} Return`}
                  value={`${summary.roi >= 0 ? '+' : ''}${summary.roi.toFixed(2)}%`}
                  subValue={fmtUsd(summary.pnl)}
                  isPositive={summary.roi >= 0}
                  icon={summary.roi >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                />
                <SummaryCard
                  label="Best Performer"
                  value={summary.bestAsset?.ticker || 'N/A'}
                  subValue={summary.bestAsset ? `${(parseFloat(summary.bestAsset.roi) * 100).toFixed(1)}% ROI` : undefined}
                  isPositive={true}
                  icon={<Target size={18} />}
                />
                <SummaryCard
                  label="Top Allocation"
                  value={pieData[0]?.name || 'N/A'}
                  subValue={pieData[0] ? `${pieData[0].percent.toFixed(1)}% of total` : undefined}
                  icon={<PieIcon size={18} />}
                />
              </div>

              <section className="rounded-2xl border border-paper-line bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-paper-ink flex items-center gap-2">
                    <Activity size={20} className="text-sage-600" />
                    Performance vs Benchmark (SPY)
                  </h2>
                  <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-sage-600" />
                      <span>Portfolio</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span>S&P 500</span>
                    </div>
                  </div>
                </div>
                <div className="h-[350px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_THEME.line} stopOpacity={0.1} />
                          <stop offset="95%" stopColor={CHART_THEME.line} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: CHART_THEME.muted, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: CHART_THEME.muted, fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: CHART_THEME.tooltipBg,
                          border: `1px solid ${CHART_THEME.tooltipBorder}`,
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          color: CHART_THEME.fg,
                          fontSize: '12px',
                        }}
                        formatter={(value, name) => {
                          const val = Number(value ?? 0).toFixed(2) + '%';
                          if (name === 'portfolioReturn') return [val, 'Portfolio'];
                          if (name === 'spyReturn') return [val, 'S&P 500'];
                          return [val, name];
                        }}
                        labelFormatter={(label, payload) => {
                          const row = payload?.[0]?.payload as { date?: string; total?: number };
                          return row?.date ? `${row.date} (Value: ${fmtUsd(row.total || 0)})` : label;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="portfolioReturn"
                        stroke={CHART_THEME.line}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="spyReturn"
                        stroke={CHART_THEME.lineAlt}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="rounded-2xl border border-paper-line bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-paper-ink mb-6 flex items-center gap-2">
                    <PieIcon size={20} className="text-sage-600" />
                    Asset Allocation
                  </h2>
                  <div className="h-[320px] w-full min-w-0 flex items-center justify-center">
                    {pieData.length === 0 ? (
                      <p className="text-sm text-paper-muted italic">No allocation to display.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={4}
                            label={(props) => props.name}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length] ?? '#7c8b6f'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: CHART_THEME.tooltipBg,
                              border: `1px solid ${CHART_THEME.tooltipBorder}`,
                              borderRadius: '12px',
                              color: CHART_THEME.fg,
                            }}
                            formatter={(value, _n, item) => [
                              fmtUsd(Number(value ?? 0)),
                              `${(item.payload as { percent?: number }).percent?.toFixed(1) ?? ''}% of portfolio`,
                            ]}
                          />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-paper-line bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-paper-ink mb-6 flex items-center gap-2">
                    <BarChart3 size={20} className="text-sage-600" />
                    Unrealized ROI by Holding
                  </h2>
                  <div className="h-[320px] w-full min-w-0 flex items-center justify-center">
                    {barData.length === 0 ? (
                      <p className="text-sm text-paper-muted italic">No open positions.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                          <XAxis
                            dataKey="ticker"
                            tick={{ fill: CHART_THEME.muted, fontSize: 11, fontWeight: 600 }}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={60}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: CHART_THEME.muted, fontSize: 11, fontWeight: 600 }}
                            tickFormatter={(v) => `${v}%`}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: CHART_THEME.tooltipBg,
                              border: `1px solid ${CHART_THEME.tooltipBorder}`,
                              borderRadius: '12px',
                              color: CHART_THEME.fg,
                            }}
                            formatter={(value, _name, item) => {
                              const num = Number(value ?? 0);
                              const pnl = (item.payload as { pnl?: number }).pnl;
                              return [`${num.toFixed(2)}%`, pnl !== undefined ? `P&L ${fmtUsd(pnl)}` : 'ROI'];
                            }}
                          />
                          <Bar dataKey="roiPct" radius={[6, 6, 0, 0]}>
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

function SummaryCard({ label, value, subValue, isPositive, icon }: { 
  label: string; 
  value: string; 
  subValue?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-paper-line shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-paper-muted uppercase tracking-widest">{label}</span>
        <div className="p-2 bg-paper-50 rounded-lg text-sage-600">
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-paper-ink tracking-tight">{value}</span>
        {subValue && (
          <span className={`text-xs font-semibold mt-1 ${
            isPositive === undefined ? 'text-paper-muted' : isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

