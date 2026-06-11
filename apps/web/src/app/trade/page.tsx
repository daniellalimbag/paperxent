'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TradeForm } from '@/components/dashboard/TradeForm';
import { LivePrices } from '@/components/dashboard/LivePrices';
import { useAuth } from '@/contexts/AuthContext';

export default function TradePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100">
        <p className="text-paper-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-paper-ink">Trade</h1>
            <p className="text-sm text-paper-muted mt-1">Execute paper trades against live simulated quotes.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TradeForm />
            </div>
            <div className="lg:col-span-1">
              <LivePrices />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
