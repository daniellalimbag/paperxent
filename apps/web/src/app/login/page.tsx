'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

const inputClassName =
  'w-full px-3 py-2.5 bg-paper-50 border border-paper-line rounded-md text-paper-ink placeholder:text-paper-muted/70 focus:outline-none focus:ring-2 focus:ring-sage-500/35 focus:border-sage-500 transition-shadow';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-100 px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,139,111,0.18),transparent)]"
        aria-hidden
      />
      <Card className="relative w-full max-w-md shadow-md border-paper-line/80">
        <CardHeader>
          <h1 className="text-2xl font-bold text-paper-ink text-center tracking-tight">Welcome back</h1>
          <p className="text-center text-paper-muted text-sm mt-1">Sign in to your PaperXent account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-paper-ink mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClassName}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-paper-ink mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClassName}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 px-4 rounded-md font-medium transition-colors ${
                loading
                  ? 'bg-paper-200 text-paper-muted cursor-not-allowed'
                  : 'bg-sage-600 text-white hover:bg-sage-700 shadow-sm'
              }`}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-sm text-paper-muted pt-1">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-sage-700 hover:text-sage-500 underline-offset-2 hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
