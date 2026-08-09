import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { apiClient, setUnauthorizedHandler } from '../api/client';
import { licenseInstallmentsApi, LicenseInstallmentPlan } from '../api/licenseInstallments';

// Recorded on activation for admin visibility (see admin panel's reset-device
// action) — never hard-enforced, so a null/unavailable id here just means no
// binding info is captured, not a blocked setup. Android-only build; other
// platforms (e.g. the web preview used for testing) simply send nothing.
function getDeviceId(): string | undefined {
  if (Platform.OS !== 'android') return undefined;
  try {
    return Application.getAndroidId();
  } catch {
    return undefined;
  }
}

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
  isInstallmentOverdue: boolean;
  installmentPlan: LicenseInstallmentPlan | null;
  refreshInstallmentStatus: () => Promise<void>;
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
  const [installmentPlan, setInstallmentPlan] = useState<LicenseInstallmentPlan | null>(null);

  // Re-check the trial deadline every minute so the app locks itself
  // automatically once time's up, without requiring a restart.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Poll license installment status every minute too. This is a real server
  // round trip (unlike isTrialExpired, which is computed from the JWT) since
  // a shop's installment #1 gets approved by an admin clicking an emailed
  // link, not by a request from this session — so due dates/overdue status
  // can change without this device ever being told directly.
  async function refreshInstallmentStatus() {
    try {
      const res = await licenseInstallmentsApi.getStatus();
      const plan = res.data.data;
      setInstallmentPlan(plan);

      // Self-heal the stale session: installment #1 gets approved by an
      // admin, not by a request from this device, so the locally stored user
      // object (and isTrialExpired, which is computed from it) would
      // otherwise stay stuck showing "trial expired" forever even after the
      // shop is unlocked server-side. Patch it the same way a real
      // upgradeAccount() response would.
      const installment1Paid = !!plan?.installments.some(
        (i) => i.installmentNumber === 1 && i.status === 'PAID'
      );
      if (installment1Paid) {
        setUser((prev) => {
          if (!prev || prev.plan !== 'TRIAL') return prev;
          const updated = { ...prev, plan: plan!.plan, trialEndsAt: null };
          AsyncStorage.setItem('auth_user', JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      }
    } catch {
      // silent — non-critical, next poll retries
    }
  }

  useEffect(() => {
    if (!token) { setInstallmentPlan(null); return; }
    refreshInstallmentStatus();
    const id = setInterval(refreshInstallmentStatus, 60 * 1000);
    return () => clearInterval(id);
  }, [token]);

  const isInstallmentOverdue = !!installmentPlan?.overdueInstallment;

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
    const res = await apiClient.post('/setup', { ...data, deviceId: getDeviceId() });
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
    <AuthContext.Provider value={{
      user, token, loading, isNewInstall, isTrialExpired, hasProAccess,
      isInstallmentOverdue, installmentPlan, refreshInstallmentStatus,
      login, setupShop, startTrial, upgradeAccount, forgotPassword, resetPassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
