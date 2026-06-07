import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

const mockPortfolioData = {
  totalValue: 125430.50,
  totalInvested: 100000.00,
  totalPnL: 25430.50,
  totalROI: 25.43,
  cashBalance: 15430.50,
  dayChange: 1230.75,
  dayChangePercent: 0.99
};

export function PortfolioSummary() {
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
              ${mockPortfolioData.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-paper-muted mb-1">Total P&L</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-green-600">
                +${mockPortfolioData.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <Badge variant="success">+{mockPortfolioData.totalROI.toFixed(2)}%</Badge>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-paper-muted mb-1">Cash Balance</p>
            <p className="text-2xl font-bold text-paper-ink">
              ${mockPortfolioData.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-paper-muted mb-1">Day Change</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-green-600">
                +${mockPortfolioData.dayChange.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <Badge variant="success">+{mockPortfolioData.dayChangePercent.toFixed(2)}%</Badge>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-paper-muted mb-1">Total Invested</p>
            <p className="text-2xl font-bold text-paper-ink">
              ${mockPortfolioData.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-paper-muted mb-1">Buying Power</p>
            <p className="text-2xl font-bold text-sage-700">
              ${mockPortfolioData.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
