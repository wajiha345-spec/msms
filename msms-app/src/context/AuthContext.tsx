import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

interface AuthUser {
  id:       string;
  username: string;
  role:     string;
  shopName: string;
  plan:     string;
}

interface AuthContextType {
  user:        AuthUser | null;
  token:       string | null;
  loading:     boolean;
  isNewInstall: boolean;
  login:       (username: string, password: string) => Promise<void>;
  setupShop:   (data: { licenseKey: string; shopName: string; username: string; password: string }) => Promise<void>;
  logout:      () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]         = useState<AuthUser | null>(null);
  const [token,        setToken]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [isNewInstall, setIsNewInstall] = useState(false);

  useEffect(() => {
    async function init() {
      const [savedToken, accountRegistered] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('account_registered'),
      ]);

      if (savedToken) {
        setToken(savedToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } else if (!accountRegistered) {
        // No token AND no account ever created on this device → show SetupScreen
        setIsNewInstall(true);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function login(username: string, password: string) {
    const res = await apiClient.post('/auth/login', { username, password });
    const { token: t, user: u } = res.data.data;
    applySession(t, u);
  }

  async function setupShop(data: {
    licenseKey: string;
    shopName:   string;
    username:   string;
    password:   string;
  }) {
    const res = await apiClient.post('/setup', data);
    const { token: t, user: u } = res.data.data;
    await AsyncStorage.setItem('account_registered', '1');
    setIsNewInstall(false);
    applySession(t, u);
  }

  async function applySession(t: string, u: AuthUser) {
    setToken(t);
    setUser(u);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    await AsyncStorage.setItem('auth_token', t);
  }

  function logout() {
    setToken(null);
    setUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
    AsyncStorage.removeItem('auth_token');
    // Keep 'account_registered' so they see Login not Setup
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, isNewInstall, login, setupShop, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
