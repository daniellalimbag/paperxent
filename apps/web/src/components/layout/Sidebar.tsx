'use client';

import React, { useState } from 'react';
import { LayoutDashboard, Briefcase, TrendingUp, FileText, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, active: true },
  { label: 'Portfolio', icon: <Briefcase size={20} /> },
  { label: 'Trade', icon: <TrendingUp size={20} /> },
  { label: 'Transactions', icon: <FileText size={20} /> },
  { label: 'Settings', icon: <Settings size={20} /> },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`bg-white border-r border-paper-line min-h-screen transition-all duration-300 relative ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`p-6 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        <div className={`mb-8 ${isCollapsed ? 'flex justify-center' : 'flex items-center justify-between'}`}>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-semibold text-paper-ink">PaperXent</h1>
              <p className="text-sm text-paper-muted mt-1">Trading Platform</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="bg-paper-100 hover:bg-paper-200 p-2 rounded-lg transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                item.active
                  ? 'bg-sage-500 text-white'
                  : 'text-paper-muted hover:bg-paper-100'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              {item.icon}
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </a>
          ))}
        </nav>

        {!isCollapsed && (
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-paper-100 rounded-lg p-4 border border-paper-line">
              <p className="text-sm text-paper-muted">Paper Trading</p>
              <p className="text-xs text-paper-muted mt-1">No real money involved</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
