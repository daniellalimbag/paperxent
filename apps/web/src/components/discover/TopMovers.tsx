'use client';

import React from 'react';
import Link from 'next/link';

interface Mover {
  ticker: string;
  name: string;
  change: number;
  color: string;
}

const TOP_MOVERS: Mover[] = [
  { ticker: 'ROKU', name: 'Roku', change: 20.08, color: 'bg-purple-500' },
  { ticker: 'SPCX', name: 'SpaceX', change: 19.22, color: 'bg-black' },
  { ticker: 'MAAS', name: 'Maas', change: 15.73, color: 'bg-emerald-500' },
  { ticker: 'ALMS', name: 'Alms', change: 15.55, color: 'bg-rose-400' },
  { ticker: 'ELVN', name: 'Enliven', change: 14.30, color: 'bg-teal-400' },
  { ticker: 'AKTS', name: 'Akts', change: 12.69, color: 'bg-orange-400' },
  { ticker: 'ZBIO', name: 'Zenas', change: 11.49, color: 'bg-cyan-400' },
  { ticker: 'POET', name: 'Poet', change: 11.38, color: 'bg-blue-400' },
  { ticker: 'ARM', name: 'Arm', change: 11.27, color: 'bg-sky-400' },
];

export function TopMovers() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-paper-ink">Top movers</h2>
      </div>
      <div className="flex overflow-x-auto pb-4 gap-6 no-scrollbar">
        {TOP_MOVERS.map((mover) => (
          <Link 
            key={mover.ticker} 
            href={`/discover/${mover.ticker}`}
            className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm group-hover:shadow-md transition-shadow ${mover.color}`}>
              {mover.ticker[0]}
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-paper-ink uppercase">{mover.ticker}</p>
              <p className={`text-xs font-medium ${mover.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {mover.change >= 0 ? '↑' : '↓'} {mover.change.toFixed(2)}%
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
