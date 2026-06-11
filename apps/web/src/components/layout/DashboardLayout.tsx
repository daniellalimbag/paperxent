'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { PortfolioSummary } from '../dashboard/PortfolioSummary';
import { HoldingsTable } from '../dashboard/HoldingsTable';
import { LivePrices } from '../dashboard/LivePrices';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-paper-100">
      <div className="flex h-screen min-h-0 shrink-0">
        <Sidebar />
      </div>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-paper-ink">Dashboard</h1>
              <p className="text-sm text-paper-muted mt-1">Welcome back! Here's your portfolio overview.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-paper-muted">Last updated: Just now</span>
            </div>
          </div>

          {/* Portfolio Summary */}
          <PortfolioSummary />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Holdings Table - takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <HoldingsTable />
            </div>

            {/* Live Prices - takes 1 column on large screens */}
            <div className="lg:col-span-1">
              <LivePrices />
            </div>
          </div>

          {/* Will add additional content here */}
          {children}
        </div>
      </main>
    </div>
  );
}
