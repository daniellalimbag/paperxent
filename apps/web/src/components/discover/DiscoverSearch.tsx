'use client';

import React from 'react';
import { Search } from 'lucide-react';

export function DiscoverSearch() {
  return (
    <div className="relative w-full max-w-2xl">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={18} className="text-paper-muted" />
      </div>
      <input
        type="text"
        placeholder="Search a stock or ETF (Ctrl + K)"
        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-paper-line rounded-xl leading-5 text-paper-ink placeholder-paper-muted focus:outline-none focus:ring-2 focus:ring-sage-500/35 focus:border-sage-500 sm:text-sm transition-shadow shadow-sm"
      />
    </div>
  );
}
