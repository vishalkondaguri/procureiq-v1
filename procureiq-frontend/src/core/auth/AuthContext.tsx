import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/core/api/client';
import { setAuthTokens, clearAuthTokens, getAuthToken } from './tokenStore';
import type { User } from '@/core/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      apiClient.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => clearAuthTokens())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const params = new URLSearchParams({ username: email, password });
    const { data } = await apiClient.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    setAuthTokens(data.access_token, data.refresh_token);
    setUser(data.user);
  };

  const logout = () => {
    apiClient.post('/auth/logout').catch(() => {});
    clearAuthTokens();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
