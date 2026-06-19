'use client';

import type { TradeAnalysis, TradeAnalysisSeverity } from '@paperxent/shared-types';
import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';

const SEVERITY_STYLES: Record<
  TradeAnalysisSeverity,
  { icon: typeof Info; border: string; bg: string; text: string }
> = {
  positive: {
    icon: CheckCircle2,
    border: 'border-green-200',
    bg: 'bg-green-50',
    text: 'text-green-800',
  },
  neutral: {
    icon: Info,
    border: 'border-paper-line',
    bg: 'bg-paper-50',
    text: 'text-paper-ink',
  },
  caution: {
    icon: AlertTriangle,
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
  },
};

export function TradeAnalysisPanel({ analysis }: { analysis: TradeAnalysis }) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="rounded-xl border border-sage-200 bg-gradient-to-br from-sage-50 to-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-sage-100 p-2 text-sage-700">
            <Sparkles size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-sage-700">Trade analysis</p>
            <p className="text-sm text-paper-ink leading-relaxed">{analysis.summary}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Position weight" value={`${analysis.metrics.position_weight_pct}%`} />
        <Metric label="Cash remaining" value={`${analysis.metrics.cash_remaining_pct}%`} />
        <Metric label="Trade size" value={`$${analysis.metrics.trade_notional}`} />
        <Metric label="Account value" value={`$${analysis.metrics.portfolio_value}`} />
      </div>

      <div className="space-y-2">
        {analysis.insights.map((insight) => {
          const style = SEVERITY_STYLES[insight.severity];
          const Icon = style.icon;
          return (
            <div
              key={`${insight.type}-${insight.title}`}
              className={`rounded-lg border p-3 ${style.border} ${style.bg}`}
            >
              <div className="flex items-start gap-2">
                <Icon size={16} className={`mt-0.5 shrink-0 ${style.text}`} />
                <div>
                  <p className={`text-sm font-semibold ${style.text}`}>{insight.title}</p>
                  <p className="text-xs text-paper-muted mt-0.5 leading-relaxed">{insight.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-paper-line bg-white px-3 py-2">
      <p className="text-paper-muted uppercase tracking-wider font-bold">{label}</p>
      <p className="text-paper-ink font-semibold mt-0.5">{value}</p>
    </div>
  );
}
