'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { portfolioApi, ApiError } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import type { PortfolioValuation } from '@paperxent/shared-types';

function num(s: string | undefined): number {
  const n = parseFloat(s ?? '0');
  return Number.isFinite(n) ? n : 0;
}

export function PortfolioSummary() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioValuation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        setError(null);
        const data = await portfolioApi.getValuation();
        setPortfolio(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load portfolio data');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadPortfolio();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !portfolio) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-paper-ink">Portfolio Summary</h2>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error || 'Failed to load portfolio data'}</p>
        </CardContent>
      </Card>
    );
  }

  const cashBalance = num(user?.balance);
  const holdingsValue = num(portfolio.totalPortfolioValue);
  const totalValue = cashBalance + holdingsValue;
  const totalGainLoss = num(portfolio.totalUnrealizedPnl);
  const totalGainLossPercent = num(portfolio.totalRoi) * 100;
  const positionCount = portfolio.assets?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-paper-ink">Portfolio Summary</h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-paper-muted mb-1">Total Value</p>
            <p className="text-2xl font-bold text-paper-ink">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-paper-muted mt-1">Cash + securities</p>
          </div>

          <div>
            <p className="text-sm text-paper-muted mb-1">Total P&L</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <Badge variant={totalGainLoss >= 0 ? 'success' : 'danger'}>
                {totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-paper-muted mb-1">Cash Balance</p>
            <p className="text-2xl font-bold text-paper-ink">
              ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-sm text-paper-muted mb-1">Holdings Value</p>
            <p className="text-2xl font-bold text-paper-ink">
              ${holdingsValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-sm text-paper-muted mb-1">Buying Power</p>
            <p className="text-2xl font-bold text-sage-700">
              ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-sm text-paper-muted mb-1">Number of Holdings</p>
            <p className="text-2xl font-bold text-paper-ink">{positionCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
