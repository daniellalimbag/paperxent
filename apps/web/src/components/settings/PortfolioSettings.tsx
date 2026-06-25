'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { settingsApi, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { RotateCcw, Wallet } from 'lucide-react';

function formatMoney(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PortfolioSettings() {
  const { user, refreshUser } = useAuth();
  const [startingBalance, setStartingBalance] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.get();
      setStartingBalance(data.startingBalance);
      setCurrentBalance(data.balance);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const notifyPortfolioChanged = () => {
    window.dispatchEvent(new CustomEvent('paperxent:trade-executed'));
    window.dispatchEvent(new CustomEvent('paperxent:portfolio-reset'));
  };

  const handleSaveStartingBalance = async () => {
    const amount = parseFloat(startingBalance);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid starting balance');
      return;
    }

    setSaving(true);
    try {
      const data = await settingsApi.updateStartingBalance(amount.toFixed(2));
      setStartingBalance(data.startingBalance);
      setCurrentBalance(data.balance);
      await refreshUser();
      toast.success('Starting balance updated');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save starting balance');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPortfolio = async () => {
    setResetting(true);
    try {
      const data = await settingsApi.resetPortfolio();
      setCurrentBalance(data.balance);
      setStartingBalance(data.startingBalance);
      await refreshUser();
      notifyPortfolioChanged();
      setConfirmOpen(false);
      toast.success('Portfolio reset — cash restored to your starting balance');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not reset portfolio');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-paper-muted">Loading portfolio settings…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-paper-line bg-paper-50 p-4 text-sm">
        <p className="text-paper-muted">Current cash balance</p>
        <p className="text-2xl font-bold text-paper-ink mt-1">${formatMoney(currentBalance || user?.balance || '0')}</p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-paper-ink" htmlFor="starting-balance">
          Starting balance
        </label>
        <p className="text-xs text-paper-muted">
          Cash granted on signup and after a portfolio reset. Changing this does not adjust your current balance until you reset.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-muted" />
            <input
              id="starting-balance"
              type="number"
              min={1000}
              step="0.01"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              className="w-full rounded-lg border border-paper-line bg-white pl-9 pr-3 py-2 text-sm text-paper-ink focus:outline-none focus:ring-2 focus:ring-sage-400"
            />
          </div>
          <Button onClick={() => void handleSaveStartingBalance()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="border-t border-paper-line pt-6 space-y-3">
        <h3 className="text-sm font-semibold text-paper-ink">Reset portfolio</h3>
        <p className="text-xs text-paper-muted">
          Clears all holdings, trade history, and performance snapshots. Your cash is set back to $
          {formatMoney(startingBalance)}. Watchlist and price alerts are kept.
        </p>
        <Button
          variant="outline"
          className="border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => setConfirmOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            <RotateCcw size={16} />
            Reset portfolio
          </span>
        </Button>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => !resetting && setConfirmOpen(false)} title="Reset portfolio?">
        <div className="space-y-4">
          <p className="text-sm text-paper-muted">
            This cannot be undone. All positions and transactions will be deleted and your cash balance will become $
            {formatMoney(startingBalance)}.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleResetPortfolio()}
              disabled={resetting}
            >
              {resetting ? 'Resetting…' : 'Yes, reset'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
