import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import BottomTabs from './BottomTabs';
import { desktopFeatureNavItems, desktopBusinessNavItems, type DesktopNavItem } from './desktopNavItems';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/notifications';
import { colors } from '../theme/colors';

// Desktop-only shell (mounted at RootNavigator's Main swap point instead of
// BottomTabs when Platform.OS === 'web'). Renders BottomTabs' own
// Tab.Navigator with a custom sidebar in place of the bottom tab bar, using
// bottom-tabs' native tabBarPosition="left" (sets flexDirection: 'row' and
// places the tab bar before the screen content — no CSS overrides needed).
// This reuses every existing nested stack (ProductsStack/SalesStack/
// PurchasesStack/MoreStack) AND every existing navigation.navigate('XTab',
// {screen}) call scattered across other screens (DashboardScreen's quick
// actions, MoreMenuScreen's import links, etc.) unchanged, since the real
// Tab.Navigator route tree still exists — a from-scratch local-state shell
// would silently break all of those. Mobile's BottomTabs rendering (no
// tabBar/tabBarPosition passed) is unaffected.
export default function DesktopShell() {
  return (
    <BottomTabs
      tabBarPosition="left"
      tabBar={(props) => <DesktopSidebar {...props} />}
    />
  );
}

const PRIMARY_TABS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'DashboardTab', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'ProductsTab',  label: 'Products',  icon: 'cube-outline' },
  { key: 'SalesTab',     label: 'Sales',     icon: 'cash-outline' },
  { key: 'PurchasesTab', label: 'Purchases', icon: 'cart-outline' },
];

// Screens that have an "add new" target reachable from the current
// top-level tab — used by the Ctrl+N shortcut below. Scoped to only what's
// unambiguous from the active route; screens without a clear single "new"
// action (Dashboard, More-hosted screens) are deliberately left out rather
// than guessed at.
const NEW_ITEM_TARGET: Record<string, { tab: string; screen: string }> = {
  ProductsTab: { tab: 'ProductsTab', screen: 'AddProduct' },
  SalesTab:    { tab: 'SalesTab',    screen: 'NewSale' },
  PurchasesTab: { tab: 'PurchasesTab', screen: 'NewPurchase' },
};

function DesktopSidebar({ state, navigation }: BottomTabBarProps) {
  const { user, logout, hasProAccess } = useAuth();
  const isPro = hasProAccess;

  // Desktop-only keyboard shortcuts. Scoped to what's unambiguous without a
  // per-screen registration system: Ctrl+N (context-aware "add new", using
  // the definitively-known active route from Tab state) and Esc (blur
  // whatever input currently has focus — safe regardless of which screen it
  // belongs to). Ctrl+F/Ctrl+P/Ctrl+S are deliberately not implemented here:
  // a generic DOM-query approach risks targeting the wrong screen, since
  // bottom-tabs keeps inactive tab screens mounted (only visually hidden)
  // for performance — a real per-screen registration hook would be needed
  // to do those safely, left as a follow-up rather than guessed at.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement | null)?.blur?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        const activeRouteName = state.routes[state.index]?.name;
        const target = activeRouteName && NEW_ITEM_TARGET[activeRouteName];
        if (target) {
          e.preventDefault();
          navigation.navigate(target.tab, { screen: target.screen } as never);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, navigation]);

  const isOwner = user?.role === 'admin';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isPro) return;
    notificationsApi.getUnreadCount()
      .then((res) => setUnreadCount(res.data.data.count))
      .catch(() => {});
  }, [isPro]);

  const activeRouteName = state.routes[state.index]?.name;

  function handleFeaturePress(item: DesktopNavItem) {
    if (!isPro) {
      Alert.alert(
        'PRO Feature',
        `"${item.label}" is only available on the PRO plan.\n\nContact us to upgrade your license.`,
        [{ text: 'OK' }]
      );
      return;
    }
    navigation.navigate(item.tab, { screen: item.screen } as never);
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/smartshop-mark.png')} style={styles.logoMark} />
          <Text style={styles.logo}>SmartShop</Text>
        </View>
        {user && (
          <View style={styles.userBadge}>
            <Text style={styles.userText} numberOfLines={1}>{user.shopName}</Text>
            <Text style={[styles.planBadge, !isPro && styles.planBadgeSimple]}>{user.plan}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>Main</Text>
        {PRIMARY_TABS.map((tab) => (
          <SidebarRow
            key={tab.key}
            icon={tab.icon}
            label={tab.label}
            active={activeRouteName === tab.key}
            onPress={() => navigation.navigate(tab.key as never)}
          />
        ))}

        <Text style={styles.sectionLabel}>Features</Text>
        {desktopFeatureNavItems.map((item) => (
          <SidebarRow
            key={item.screen}
            icon={item.icon}
            label={item.label}
            locked={!isPro}
            badge={isPro && item.screen === 'Notifications' && unreadCount > 0 ? unreadCount : undefined}
            onPress={() => handleFeaturePress(item)}
          />
        ))}

        {isOwner && (
          <>
            <Text style={styles.sectionLabel}>Business Management</Text>
            {desktopBusinessNavItems.map((item) => (
              <SidebarRow
                key={item.screen}
                icon={item.icon}
                label={item.label}
                locked={!isPro}
                onPress={() => handleFeaturePress(item)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={16} color={colors.danger} style={styles.logoutIcon} />
        <Text style={styles.logoutLabel}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

function SidebarRow({
  icon, label, active, locked, badge, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean; locked?: boolean; badge?: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, active && styles.rowActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? colors.primary : (locked ? colors.textMuted : colors.text)}
        style={styles.rowIcon}
      />
      <Text style={[styles.rowLabel, active && styles.rowLabelActive, locked && styles.rowLabelLocked]} numberOfLines={1}>
        {label}
      </Text>
      {locked && <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />}
      {!locked && !!badge && (
        <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{badge}</Text></View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    height: '100%',
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 26, height: 26 },
  logo: { fontSize: 20, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  userBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  userText: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  planBadge: {
    fontSize: 10, fontWeight: '700', color: colors.primary,
    backgroundColor: colors.primary + '18', paddingHorizontal: 7,
    paddingVertical: 2, borderRadius: 8,
  },
  planBadgeSimple: { color: colors.textMuted, backgroundColor: colors.textMuted + '18' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 18, marginBottom: 6, marginLeft: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 10,
    borderRadius: 8, marginBottom: 2,
  },
  rowActive: { backgroundColor: colors.primary + '14' },
  rowIcon: { fontSize: 16, marginRight: 10, width: 20, textAlign: 'center' },
  rowLabel: { fontSize: 13, color: colors.text, flex: 1 },
  rowLabelActive: { color: colors.primary, fontWeight: '700' },
  rowLabelLocked: { color: colors.textMuted },
  unreadBadge: {
    backgroundColor: colors.danger, borderRadius: 9,
    minWidth: 17, height: 17, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  logoutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  logoutIcon: { fontSize: 16, marginRight: 10 },
  logoutLabel: { fontSize: 13, fontWeight: '600', color: colors.danger },
});
