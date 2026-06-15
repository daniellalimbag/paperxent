'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Briefcase, Compass, FileText, Settings, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/dashboard' },
  { label: 'Portfolio', icon: <Briefcase size={20} />, href: '/portfolio' },
  { label: 'Discover', icon: <Compass size={20} />, href: '/discover' },
  { label: 'History', icon: <FileText size={20} />, href: '/history' },
  { label: 'Settings', icon: <Settings size={20} />, href: '/settings' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch {
      toast.error('Failed to logout');
    }
  };

  return (
    <aside
      className={`sticky top-0 h-screen flex flex-col bg-white border-r border-paper-line transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className={`relative flex flex-col h-full p-6 ${isCollapsed ? 'items-center' : ''}`}>
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

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-32">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active ? 'bg-sage-500 text-white' : 'text-paper-muted hover:bg-paper-100'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                {item.icon}
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="absolute bottom-6 left-6 right-6 space-y-4">
            <div className="bg-paper-100 rounded-lg p-4 border border-paper-line">
              <p className="text-sm font-medium text-paper-ink">{user?.email}</p>
              <p className="text-xs text-paper-muted mt-1">Balance: ${user?.balance}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-paper-muted hover:bg-paper-100 w-full"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
