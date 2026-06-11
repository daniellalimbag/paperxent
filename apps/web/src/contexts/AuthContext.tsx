'use client';

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { authApi } from '@/lib/api-client';
import type { AuthResponse } from '@paperxent/shared-types';

interface AuthContextType {
  user: AuthResponse['user'] | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  /** Bumps when login/register/logout runs so a slow initial `/proxy/api/auth/me` cannot clear state after cookies exist. */
  const authSessionGeneration = useRef(0);

  useEffect(() => {
    const clearUserState = () => {
      localStorage.removeItem('user');
      setUser(null);
    };

    const genAtStart = ++authSessionGeneration.current;

    const tryRestoreUserFromStorage = () => {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (!userStr) return;
      try {
        const parsed = JSON.parse(userStr) as AuthResponse['user'];
        if (parsed?.id && parsed?.email) {
          setUser(parsed);
        }
      } catch {
        localStorage.removeItem('user');
      }
    };

    const checkAuth = async () => {
      try {
        const res = await fetch('/proxy/api/auth/me', { credentials: 'include' });
        if (genAtStart !== authSessionGeneration.current) {
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { user?: AuthResponse['user'] };
          if (genAtStart !== authSessionGeneration.current) {
            return;
          }
          if (data.user?.id && data.user?.email) {
            setUser(data.user);
            try {
              localStorage.setItem('user', JSON.stringify(data.user));
            } catch {
              // non-fatal
            }
          } else {
            clearUserState();
          }
        } else if (res.status === 401) {
          if (genAtStart !== authSessionGeneration.current) {
            return;
          }
          clearUserState();
        } else {
          // 502/503/etc.: do not wipe local session; middleware may still see a cookie.
          if (genAtStart !== authSessionGeneration.current) {
            return;
          }
          tryRestoreUserFromStorage();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (genAtStart !== authSessionGeneration.current) {
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    authSessionGeneration.current += 1;
    const { user: nextUser } = await authApi.login({ email, password });
    setUser(nextUser);
  };

  const register = async (email: string, password: string) => {
    authSessionGeneration.current += 1;
    const { user: nextUser } = await authApi.register({ email, password });
    setUser(nextUser);
  };

  const logout = async () => {
    authSessionGeneration.current += 1;
    await authApi.logout();
    setUser(null);
  };

  const refreshTokens = async () => {
    try {
      const { user: nextUser } = await authApi.refresh();
      setUser(nextUser);
    } catch {
      // leave current user; caller may redirect on 401 elsewhere
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
