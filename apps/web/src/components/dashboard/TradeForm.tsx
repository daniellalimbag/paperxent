'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { toast } from 'sonner';
import { tradeApi, ApiError } from '@/lib/api-client';
import type { TradeSide } from '@paperxent/shared-types';

export function TradeForm() {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [side, setSide] = useState<TradeSide>('BUY');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticker || !quantity || !price) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await tradeApi.executeTrade({
        ticker: ticker.toUpperCase(),
        quantity,
        price,
        side,
      });

      toast.success(`Trade executed successfully: ${side} ${quantity} ${ticker.toUpperCase()} @ $${price}`);

      // Reset form
      setTicker('');
      setQuantity('');
      setPrice('');
      setSide('BUY');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to execute trade');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-paper-ink">Execute Trade</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-paper-muted mb-2">
              Ticker Symbol
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g., AAPL"
              className="w-full px-3 py-2 bg-paper-50 border border-paper-line rounded-md text-paper-ink placeholder:text-paper-muted/70 focus:outline-none focus:ring-2 focus:ring-sage-500/35 focus:border-sage-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-paper-muted mb-2">
              Quantity
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 10"
              className="w-full px-3 py-2 bg-paper-50 border border-paper-line rounded-md text-paper-ink placeholder:text-paper-muted/70 focus:outline-none focus:ring-2 focus:ring-sage-500/35 focus:border-sage-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-paper-muted mb-2">
              Price
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 150.00"
              className="w-full px-3 py-2 bg-paper-50 border border-paper-line rounded-md text-paper-ink placeholder:text-paper-muted/70 focus:outline-none focus:ring-2 focus:ring-sage-500/35 focus:border-sage-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-paper-muted mb-2">
              Order Type
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  side === 'BUY'
                    ? 'bg-green-600 text-white'
                    : 'bg-paper-100 text-paper-muted border border-paper-line hover:bg-paper-200'
                }`}
                disabled={loading}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  side === 'SELL'
                    ? 'bg-red-600 text-white'
                    : 'bg-paper-100 text-paper-muted border border-paper-line hover:bg-paper-200'
                }`}
                disabled={loading}
              >
                SELL
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
              loading
                ? 'bg-paper-200 text-paper-muted cursor-not-allowed'
                : 'bg-sage-600 text-white hover:bg-sage-700'
            }`}
            disabled={loading}
          >
            {loading ? 'Executing...' : `Execute ${side} Order`}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
