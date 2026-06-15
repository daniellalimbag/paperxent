'use client';

import React from 'react';

const FILTERS = [
  'All stocks',
  'ETF',
  'S&P 500',
  'Dow',
  'Nasdaq 100',
  'Stocks under $50',
  'Stocks under $10',
  'Fortune 100',
  'Gold',
  'Commodities',
  'Shariah',
  'Hot IPOs',
  'Bitcoin ETF',
];

export function MarketFilterChips() {
  const [activeFilter, setActiveFilter] = React.useState('All stocks');

  React.useEffect(() => {
    const saved = localStorage.getItem('discover_active_filter');
    if (saved && FILTERS.includes(saved)) {
      setActiveFilter(saved);
    }
  }, []);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    localStorage.setItem('discover_active_filter', filter);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => handleFilterClick(filter)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            activeFilter === filter
              ? 'bg-sage-500 text-white border-sage-600'
              : 'bg-white text-paper-muted border-paper-line hover:bg-paper-50'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
