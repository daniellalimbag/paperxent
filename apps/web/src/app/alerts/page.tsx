'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { alertsApi, ApiError } from '@/lib/api-client';
import type { PaperAlert } from '@paperxent/shared-types';
import { Bell, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function formatAlertLabel(alert: PaperAlert): string {
  switch (alert.type) {
    case 'PRICE_ABOVE':
      return `Price ≥ $${Number(alert.targetPrice ?? 0).toFixed(2)}`;
    case 'PRICE_BELOW':
      return `Price ≤ $${Number(alert.targetPrice ?? 0).toFixed(2)}`;
    case 'PERCENT_UP':
      return `Up ${(parseFloat(alert.percentThreshold ?? '0') * 100).toFixed(1)}% from $${Number(alert.baselinePrice).toFixed(2)}`;
    case 'PERCENT_DOWN':
      return `Down ${(parseFloat(alert.percentThreshold ?? '0') * 100).toFixed(1)}% from $${Number(alert.baselinePrice).toFixed(2)}`;
    default:
      return alert.type;
  }
}

export default function AlertsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [active, setActive] = useState<PaperAlert[]>([]);
  const [triggered, setTriggered] = useState<PaperAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await alertsApi.list();
      setActive(data.active);
      setTriggered(data.triggered);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [user, load]);

  const handleRemove = async (id: string) => {
    try {
      await alertsApi.remove(id);
      setActive((prev) => prev.filter((a) => a.id !== id));
      setTriggered((prev) => prev.filter((a) => a.id !== id));
      toast.success('Alert removed');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not remove alert');
    }
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
      <main className="flex-1 min-w-0 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-paper-ink flex items-center gap-2">
              <Bell size={28} className="text-sage-600" />
              Paper alerts
            </h1>
            <p className="text-sm text-paper-muted mt-1">
              Get notified when a ticker hits a target price or moves by a set percentage. Create alerts from any{' '}
              <Link href="/discover" className="text-sage-700 hover:underline">
                stock detail
              </Link>{' '}
              page.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-paper-muted">Loading alerts…</p>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-paper-ink">Active ({active.length})</h2>
                {active.length === 0 ? (
                  <p className="text-sm text-paper-muted rounded-xl border border-paper-line bg-white p-4">
                    No active alerts. Open a stock and set a price or percent-move alert.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {active.map((alert) => (
                      <AlertRow key={alert.id} alert={alert} onRemove={() => void handleRemove(alert.id)} />
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-paper-ink">Recently triggered</h2>
                {triggered.length === 0 ? (
                  <p className="text-sm text-paper-muted rounded-xl border border-paper-line bg-white p-4">
                    Triggered alerts appear here for 30 days.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {triggered.map((alert) => (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        triggered
                        onRemove={() => void handleRemove(alert.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function AlertRow({
  alert,
  triggered,
  onRemove,
}: {
  alert: PaperAlert;
  triggered?: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-paper-line bg-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/discover/${alert.ticker}`}
            className="font-bold text-paper-ink hover:text-sage-700"
          >
            {alert.ticker}
          </Link>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              triggered ? 'bg-amber-100 text-amber-900' : 'bg-sage-100 text-sage-800'
            }`}
          >
            {triggered ? 'Triggered' : 'Active'}
          </span>
        </div>
        <p className="text-sm text-paper-muted mt-0.5">{formatAlertLabel(alert)}</p>
        {triggered && alert.triggeredAt && (
          <p className="text-xs text-paper-muted mt-1">
            Fired {new Date(alert.triggeredAt).toLocaleString()}
            {alert.triggeredPrice ? ` at $${Number(alert.triggeredPrice).toFixed(2)}` : ''}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-2 text-paper-muted hover:text-red-600 rounded-lg hover:bg-red-50"
        title="Remove alert"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
