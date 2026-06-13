'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { toast } from 'sonner';
import { tradeApi, ApiError, type TradePreviewResult } from '@/lib/api-client';
import type { TradeSide } from '@paperxent/shared-types';
import { DollarSign, Hash, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TradeFormProps {
  initialTicker?: string;
  lockTicker?: boolean;
  hideHeader?: boolean;
  onSuccess?: () => void;
}

type OrderMode = 'SHARES' | 'DOLLARS';

export function TradeForm({ 
  initialTicker = '', 
  lockTicker = false, 
  hideHeader = false,
  onSuccess 
}: TradeFormProps) {
  const { refreshUser } = useAuth();
  const [ticker, setTicker] = useState(initialTicker);
  const [amount, setAmount] = useState('');
  const [side, setSide] = useState<TradeSide>('BUY');
  const [orderMode, setOrderMode] = useState<OrderMode>('SHARES');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<TradePreviewResult | null>(null);

  // Update ticker if initialTicker prop changes
  useEffect(() => {
    if (initialTicker) {
      setTicker(initialTicker);
      setPreview(null);
    }
  }, [initialTicker]);

  // Clear preview when inputs change
  useEffect(() => {
    setPreview(null);
  }, [ticker, amount, side, orderMode]);

  const handlePreview = async (e: FormEvent) => {
    e.preventDefault();

    if (!ticker || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const result = await tradeApi.previewTrade({
        side,
        ticker: ticker.toUpperCase(),
        quantity: orderMode === 'SHARES' ? amount : undefined,
        notional: orderMode === 'DOLLARS' ? amount : undefined,
      });
      setPreview(result);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to get trade preview');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!preview) return;

    try {
      setLoading(true);
      await tradeApi.executeTrade({
        side,
        ticker: ticker.toUpperCase(),
        quantity: orderMode === 'SHARES' ? amount : undefined,
        notional: orderMode === 'DOLLARS' ? amount : undefined,
      });

      const action = side === 'BUY' ? 'bought' : 'sold';
      const units = orderMode === 'SHARES' ? `${amount} shares` : `$${amount}`;
      toast.success(`Successfully ${action} ${units} of ${ticker.toUpperCase()}`);

      // Reset form
      if (!lockTicker) setTicker('');
      setAmount('');
      setPreview(null);
      
      // Refresh user balance and trigger global portfolio refresh
      void refreshUser();
      window.dispatchEvent(new CustomEvent('paperxent:trade-executed'));
      
      onSuccess?.();
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

  const formContent = (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-2 p-1 bg-paper-100 rounded-lg">
          <button
            type="button"
            onClick={() => setOrderMode('SHARES')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              orderMode === 'SHARES'
                ? 'bg-white text-paper-ink shadow-sm'
                : 'text-paper-muted hover:text-paper-ink'
            }`}
          >
            <Hash size={16} />
            Shares
          </button>
          <button
            type="button"
            onClick={() => setOrderMode('DOLLARS')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              orderMode === 'DOLLARS'
                ? 'bg-white text-paper-ink shadow-sm'
                : 'text-paper-muted hover:text-paper-ink'
            }`}
          >
            <DollarSign size={16} />
            Dollars
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`flex-1 py-2 px-4 rounded-md font-bold transition-colors border-2 ${
              side === 'BUY'
                ? 'bg-green-50 border-green-600 text-green-700'
                : 'bg-white border-paper-line text-paper-muted hover:bg-paper-50'
            }`}
            disabled={loading}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`flex-1 py-2 px-4 rounded-md font-bold transition-colors border-2 ${
              side === 'SELL'
                ? 'bg-red-50 border-red-600 text-red-700'
                : 'bg-white border-paper-line text-paper-muted hover:bg-paper-50'
            }`}
            disabled={loading}
          >
            SELL
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-paper-muted uppercase tracking-wider mb-1.5">
              Ticker Symbol
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g., AAPL"
              className={`w-full px-4 py-3 bg-white border border-paper-line rounded-xl text-paper-ink font-bold placeholder:text-paper-muted/50 focus:outline-none focus:ring-2 focus:ring-sage-500/35 focus:border-sage-500 transition-all ${lockTicker ? 'bg-paper-50 opacity-80 cursor-not-allowed' : ''}`}
              disabled={loading || lockTicker}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-paper-muted uppercase tracking-wider mb-1.5">
              {orderMode === 'SHARES' ? 'Number of Shares' : 'Dollar Amount'}
            </label>
            <div className="relative">
              {orderMode === 'DOLLARS' && (
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-paper-muted font-bold">$</span>
                </div>
              )}
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={orderMode === 'SHARES' ? '0.00' : '0.00'}
                className={`w-full ${orderMode === 'DOLLARS' ? 'pl-8' : 'px-4'} py-3 bg-white border border-paper-line rounded-xl text-paper-ink font-bold placeholder:text-paper-muted/50 focus:outline-none focus:ring-2 focus:ring-sage-500/35 focus:border-sage-500 transition-all`}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>

      {preview ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-paper-50 border border-paper-line rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-paper-muted">Execution Price</span>
              <span className="font-bold text-paper-ink">${Number(preview.quotePrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-paper-muted">{orderMode === 'SHARES' ? 'Total Cost' : 'Shares to Receive'}</span>
              <span className="font-bold text-paper-ink">
                {orderMode === 'SHARES' ? `$${Number(preview.estimatedNotional).toFixed(2)}` : `${Number(preview.estimatedQuantity).toFixed(4)} shares`}
              </span>
            </div>
            
            <div className="pt-2 border-t border-paper-line/50 space-y-2">
              {preview.isQuoteStale && (
                <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                  <Clock size={14} />
                  Quote may be stale. Refresh for latest price.
                </div>
              )}
              {preview.insufficientFunds && (
                <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
                  <AlertCircle size={14} />
                  Insufficient funds. Balance: ${Number(preview.userBalance).toFixed(2)}
                </div>
              )}
              {preview.insufficientHoldings && (
                <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
                  <AlertCircle size={14} />
                  Insufficient holdings. You own {preview.currentHoldings} shares.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all shadow-md ${
              !preview.canExecute || loading
                ? 'bg-paper-200 text-paper-muted cursor-not-allowed shadow-none'
                : 'bg-sage-600 text-white hover:bg-sage-700 active:scale-[0.98]'
            }`}
            disabled={!preview.canExecute || loading}
          >
            {loading ? 'Executing...' : `Confirm ${side} Order`}
          </button>
          
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="w-full text-sm text-paper-muted hover:text-paper-ink font-medium transition-colors"
            disabled={loading}
          >
            Cancel and Edit
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePreview}
          className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all shadow-md ${
            !ticker || !amount || loading
              ? 'bg-paper-200 text-paper-muted cursor-not-allowed shadow-none'
              : 'bg-paper-ink text-white hover:bg-black active:scale-[0.98]'
          }`}
          disabled={!ticker || !amount || loading}
        >
          {loading ? 'Loading...' : 'Preview Order'}
        </button>
      )}
    </div>
  );

  if (hideHeader) {
    return formContent;
  }

  return (
    <Card className="overflow-hidden border-paper-line/80 shadow-lg">
      <CardHeader className="bg-paper-50 border-b border-paper-line">
        <h2 className="text-xl font-bold text-paper-ink flex items-center gap-2">
          <ArrowRight size={20} className="text-sage-600" />
          Execute Trade
        </h2>
      </CardHeader>
      <CardContent className="p-6">
        {formContent}
      </CardContent>
    </Card>
  );
}
