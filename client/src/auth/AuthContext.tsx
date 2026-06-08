import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { authProvider } from './provider';
import type { AuthUser } from './types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  loginAs(email: string): Promise<void>;
  logout(): void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProviderRoot({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tok = getToken();
    if (!tok) {
      setLoading(false);
      return;
    }
    api
      .get<AuthUser>('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const loginAs = useCallback(async (email: string) => {
    const { token, user } = await authProvider.login({ email });
    disconnectSocket();
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, loginAs, logout }), [user, loading, loginAs, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
