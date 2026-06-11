'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100">
        <p className="text-paper-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-paper-100 px-4 text-center">
        <p className="text-sm text-paper-ink max-w-md">
          We could not load your account in this tab, but your browser may still have a session cookie. Opening{' '}
          <span className="font-medium">Sign in</span> would send you back here while that cookie exists.
        </p>
        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              await logout();
              router.push('/');
            } finally {
              setSigningOut(false);
            }
          }}
          className="rounded-md bg-sage-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? 'Signing out…' : 'Sign out & clear session'}
        </button>
        <p className="text-xs text-paper-muted max-w-sm">
          This clears httpOnly cookies via the app, then you can use Sign in again.
        </p>
      </div>
    );
  }

  return <DashboardLayout />;
}
