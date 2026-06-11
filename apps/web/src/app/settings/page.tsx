'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100">
        <p className="text-paper-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-paper-ink">Settings</h1>
            <p className="text-sm text-paper-muted mt-1">Account overview. More controls can be added here later.</p>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-paper-ink">Profile</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-paper-muted">Email</p>
                <p className="text-paper-ink font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-paper-muted">Paper balance</p>
                <p className="text-paper-ink font-medium">${user.balance}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-paper-ink">Security</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-paper-muted">
                Change password and API keys are not implemented yet — use logout and re-register a test account if needed.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
