'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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

  useEffect(() => {
    // Check if user is already logged in on mount
    const checkAuth = async () => {
      try {
        const accessToken = authApi.getAccessToken();
        if (accessToken) {
          // If we have a token, we could validate it or fetch user data
          // For now, we'll just set loading to false
          // In a real app, you'd want to validate the token or fetch user profile
          const userStr = localStorage.getItem('user');
          if (userStr) {
            setUser(JSON.parse(userStr));
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setUser(response.user);
  };

  const register = async (email: string, password: string) => {
    const response = await authApi.register({ email, password });
    setUser(response.user);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const refreshTokens = async () => {
    const refreshToken = authApi.getRefreshToken();
    if (refreshToken) {
      const response = await authApi.refresh({ refreshToken });
      setUser(response.user);
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
