'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const primary =
  'px-6 py-3 bg-sage-600 text-white rounded-md hover:bg-sage-700 transition-colors shadow-sm font-medium text-center';
const secondary =
  'px-6 py-3 bg-white text-paper-ink border border-paper-line rounded-md hover:bg-paper-50 transition-colors font-medium text-center';

export function HomeAuthActions() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        <p className="text-sm text-paper-muted py-3">Checking session…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link href="/dashboard" className={`${primary} inline-block sm:min-w-[200px]`}>
          Go to dashboard
        </Link>
        <button type="button" className={`${secondary} sm:min-w-[200px]`} onClick={() => void logout()}>
          Sign out
        </button>
        <p className="w-full text-center text-xs text-paper-muted sm:order-last sm:basis-full">
          You&apos;re still signed in from an earlier session (browser cookies).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Link href="/login" className={primary}>
        Sign in
      </Link>
      <Link href="/register" className={secondary}>
        Create account
      </Link>
    </div>
  );
}
