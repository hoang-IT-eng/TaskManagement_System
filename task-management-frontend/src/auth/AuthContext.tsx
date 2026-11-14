import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, session } from '../api/client';
import type { AuthResult, CurrentUser } from '../api/types';

interface AuthState {
  user: CurrentUser | null;
  /** True until the initial silent refresh has settled. */
  booting: boolean;
  login(email: string, password: string): Promise<void>;
  register(fullName: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  updateMe(fullName: string, bio: string): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [booting, setBooting] = useState(true);
  const qc = useQueryClient();

  useEffect(() => session.subscribe((auth) => setUser(auth?.user ?? null)), []);
  useEffect(() => { refreshSession().finally(() => setBooting(false)); }, []);

  const login = useCallback(async (email: string, password: string) => {
    session.set(await api<AuthResult>('/auth/login', { method: 'POST', body: { email, password } }));
  }, []);
  const register = useCallback(async (fullName: string, email: string, password: string) => {
    session.set(await api<AuthResult>('/auth/register', { method: 'POST', body: { fullName, email, password } }));
  }, []);
  const logout = useCallback(async () => {
    try { await api<void>('/auth/logout', { method: 'POST' }); } finally { session.set(null); qc.clear(); }
  }, [qc]);
  const updateMe = useCallback(async (fullName: string, bio: string) => {
    const me = await api<CurrentUser>('/auth/me', { method: 'PATCH', body: { fullName, bio } });
    setUser(me);
  }, []);

  const value = useMemo(() => ({ user, booting, login, register, logout, updateMe }), [user, booting, login, register, logout, updateMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
