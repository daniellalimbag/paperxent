'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { alertsApi } from '@/lib/api-client';
import { toast } from 'sonner';

const POLL_MS = 30_000;
const STORAGE_KEY = 'paperxent_seen_alert_ids';

function loadSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // non-fatal
  }
}

function describeAlert(alert: {
  ticker: string;
  type: string;
  targetPrice: string | null;
  percentThreshold: string | null;
  triggeredPrice: string | null;
}): string {
  const price = alert.triggeredPrice ? `$${Number(alert.triggeredPrice).toFixed(2)}` : 'target';
  switch (alert.type) {
    case 'PRICE_ABOVE':
      return `${alert.ticker} rose to ${price} (alert above $${Number(alert.targetPrice ?? 0).toFixed(2)})`;
    case 'PRICE_BELOW':
      return `${alert.ticker} fell to ${price} (alert below $${Number(alert.targetPrice ?? 0).toFixed(2)})`;
    case 'PERCENT_UP': {
      const pct = alert.percentThreshold ? (parseFloat(alert.percentThreshold) * 100).toFixed(1) : '?';
      return `${alert.ticker} is up ${pct}%+ from your baseline (${price})`;
    }
    case 'PERCENT_DOWN': {
      const pct = alert.percentThreshold ? (parseFloat(alert.percentThreshold) * 100).toFixed(1) : '?';
      return `${alert.ticker} is down ${pct}%+ from your baseline (${price})`;
    }
    default:
      return `${alert.ticker} alert triggered at ${price}`;
  }
}

export function AlertNotifications() {
  const { user } = useAuth();
  const seenRef = useRef<Set<string>>(loadSeenIds());
  const initialPollDone = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const { triggered } = await alertsApi.list();
        if (cancelled) return;

        const newlyTriggered = triggered.filter((a) => a.triggeredAt && !seenRef.current.has(a.id));

        if (!initialPollDone.current) {
          for (const a of triggered) {
            if (a.triggeredAt) seenRef.current.add(a.id);
          }
          saveSeenIds(seenRef.current);
          initialPollDone.current = true;
          return;
        }

        for (const alert of newlyTriggered) {
          seenRef.current.add(alert.id);
          toast.info('Paper alert triggered', {
            description: describeAlert(alert),
            duration: 8000,
          });
        }

        if (newlyTriggered.length > 0) {
          saveSeenIds(seenRef.current);
        }
      } catch {
        // ignore polling errors
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user?.id]);

  return null;
}
