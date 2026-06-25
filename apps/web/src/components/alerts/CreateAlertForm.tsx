'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { alertsApi, ApiError } from '@/lib/api-client';
import type { PaperAlertType } from '@paperxent/shared-types';
import { toast } from 'sonner';

const ALERT_OPTIONS: { type: PaperAlertType; label: string; hint: string }[] = [
  { type: 'PRICE_ABOVE', label: 'Price above', hint: 'Notify when price rises to target' },
  { type: 'PRICE_BELOW', label: 'Price below', hint: 'Notify when price falls to target' },
  { type: 'PERCENT_UP', label: 'Up %', hint: 'Notify when price rises X% from now' },
  { type: 'PERCENT_DOWN', label: 'Down %', hint: 'Notify when price falls X% from now' },
];

export function CreateAlertForm({
  ticker,
  currentPrice,
  onCreated,
}: {
  ticker: string;
  currentPrice: number;
  onCreated?: () => void;
}) {
  const [type, setType] = useState<PaperAlertType>('PRICE_ABOVE');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const isPrice = type === 'PRICE_ABOVE' || type === 'PRICE_BELOW';

  const handleSubmit = async () => {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error(isPrice ? 'Enter a valid target price' : 'Enter a valid percent (1–100)');
      return;
    }
    if (!isPrice && num > 100) {
      toast.error('Percent must be 100 or less');
      return;
    }

    setLoading(true);
    try {
      await alertsApi.create({
        ticker: ticker.toUpperCase(),
        type,
        ...(isPrice ? { targetPrice: num.toFixed(4) } : { percentThreshold: String(num) }),
      });
      toast.success(`Alert set for ${ticker.toUpperCase()}`);
      setValue('');
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not create alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-paper-muted">
        Baseline: ${currentPrice.toFixed(2)} (current quote). Alerts fire once, then move to history.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {ALERT_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => {
              setType(opt.type);
              setValue('');
            }}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              type === opt.type
                ? 'bg-sage-600 text-white border-sage-600'
                : 'bg-white text-paper-muted border-paper-line hover:border-sage-400'
            }`}
            title={opt.hint}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-bold text-paper-muted uppercase tracking-wider mb-1">
          {isPrice ? 'Target price ($)' : 'Move threshold (%)'}
        </label>
        <input
          type="number"
          step={isPrice ? '0.01' : '0.1'}
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isPrice ? (type === 'PRICE_ABOVE' ? (currentPrice * 1.05).toFixed(2) : (currentPrice * 0.95).toFixed(2)) : '5'}
          className="w-full px-3 py-2 bg-white border border-paper-line rounded-lg text-sm font-semibold"
          disabled={loading}
        />
      </div>

      <Button className="w-full" disabled={loading} onClick={() => void handleSubmit()}>
        {loading ? 'Saving…' : 'Create alert'}
      </Button>
    </div>
  );
}
