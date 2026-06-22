'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { apiRequest, getToken, setToken, clearToken } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  role: 'admin' | 'editor' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true,
  login: async () => null, logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    apiRequest<User | null>('GET', '/me')
      .then(data => setUser(data))
      .catch(() => { /* network error — keep token, try next time */ })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    try {
      const data = await apiRequest<{ token: string; user: User }>(
        'POST', '/auth/login', { email, password }
      );
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        return null;
      }
      return 'Đăng nhập thất bại';
    } catch (e: any) {
      return e.message;
    }
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
