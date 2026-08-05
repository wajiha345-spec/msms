import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, setUnauthorizedHandler } from '../api/client';

interface AuthUser {
  id:       string;
  username: string;
  role:     string;
  shopName: string;
  plan:     string;
  trialEndsAt?: string | null;
}

interface AuthContextType {
  user:        AuthUser | null;
  token:       string | null;
  loading:     boolean;
  isNewInstall: boolean;
  isTrialExpired: boolean;
  hasProAccess: boolean;
  login:       (username: string, password: string) => Promise<void>;
  setupShop:   (data: { licenseKey: string; shopName: string; username: string; password: string }) => Promise<void>;
  startTrial:  (data: { shopName: string; username: string; password: string; email: string }) => Promise<void>;
  upgradeAccount: (licenseKey: string) => Promise<void>;
  forgotPassword: (username: string) => Promise<{ maskedEmail?: string }>;
  resetPassword:  (username: string, otp: string, newPassword: string) => Promise<void>;
  logout:      () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]         = useState<AuthUser | null>(null);
  const [token,        setToken]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [isNewInstall, setIsNewInstall] = useState(false);
  const [now,          setNow]          = useState(() => Date.now());

  // Re-check the trial deadline every minute so the app locks itself
  // automatically once time's up, without requiring a restart.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const isTrialExpired = !!(
    user?.plan === 'TRIAL' && user.trialEndsAt && new Date(user.trialEndsAt).getTime() <= now
  );

  // An active (non-expired) trial gets full PRO access, same as the backend's isActiveTrial().
  const hasProAccess = user?.plan === 'PRO' || (user?.plan === 'TRIAL' && !isTrialExpired);

  useEffect(() => {
    async function init() {
      const [savedToken, savedUser, accountRegistered] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('auth_user'),
        AsyncStorage.getItem('account_registered'),
      ]);

      if (savedToken) {
        setToken(savedToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        // Restore user object so plan/role are available immediately on restart
        if (savedUser) {
          try { setUser(JSON.parse(savedUser)); } catch {}
        }
      } else if (!accountRegistered) {
        // No token AND no account ever created on this device → show SetupScreen
        setIsNewInstall(true);
      }
      setLoading(false);
    }
    init();

    // Any request rejected with 401 means the stored session is dead
    // (expired/invalid token) — drop it so RootNavigator falls back to Login
    // instead of leaving the user stuck on a broken authenticated screen.
    setUnauthorizedHandler(() => logout());
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

  async function startTrial(data: {
    shopName: string;
    username: string;
    password: string;
    email:    string;
  }) {
    const res = await apiClient.post('/trial/start', data);
    const { token: t, user: u } = res.data.data;
    await AsyncStorage.setItem('account_registered', '1');
    setIsNewInstall(false);
    applySession(t, u);
  }

  // Converts the caller's existing (trial) shop to a paid plan in place —
  // all data saved during the trial stays under the same shopId.
  async function upgradeAccount(licenseKey: string) {
    const res = await apiClient.post('/setup/upgrade', { licenseKey });
    const { token: t, user: u } = res.data.data;
    applySession(t, u);
  }

  async function forgotPassword(username: string) {
    const res = await apiClient.post('/auth/forgot-password', { username });
    return { maskedEmail: res.data.data.maskedEmail as string | undefined };
  }

  async function resetPassword(username: string, otp: string, newPassword: string) {
    await apiClient.post('/auth/reset-password', { username, otp, newPassword });
  }

  async function applySession(t: string, u: AuthUser) {
    setToken(t);
    setUser(u);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    await Promise.all([
      AsyncStorage.setItem('auth_token', t),
      AsyncStorage.setItem('auth_user', JSON.stringify(u)),
    ]);
  }

  function logout() {
    setToken(null);
    setUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
    AsyncStorage.removeItem('auth_token');
    AsyncStorage.removeItem('auth_user');
    // Keep 'account_registered' so they see Login not Setup
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, isNewInstall, isTrialExpired, hasProAccess, login, setupShop, startTrial, upgradeAccount, forgotPassword, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
