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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      await register(email, password);
      toast.success('Registration successful');
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Registration failed');
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
          <h1 className="text-2xl font-bold text-paper-ink text-center tracking-tight">Create account</h1>
          <p className="text-center text-paper-muted text-sm mt-1">Sign up to start paper trading</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-paper-ink mb-1.5">
                Email
              </label>
              <input
                id="register-email"
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
              <label htmlFor="register-password" className="block text-sm font-medium text-paper-ink mb-1.5">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClassName}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-confirm" className="block text-sm font-medium text-paper-ink mb-1.5">
                Confirm password
              </label>
              <input
                id="register-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Creating account…' : 'Sign up'}
            </button>

            <p className="text-center text-sm text-paper-muted pt-1">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-sage-700 hover:text-sage-500 underline-offset-2 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
