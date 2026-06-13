'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TradeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/discover');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-100">
      <p className="text-paper-muted text-sm">Redirecting to Discover…</p>
    </div>
  );
}
