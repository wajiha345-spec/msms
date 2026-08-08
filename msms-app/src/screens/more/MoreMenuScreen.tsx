import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/notifications';
import { colors } from '../../theme/colors';

interface MenuItemProps {
  icon: string;
  label: string;
  subtitle: string;
  onPress: () => void;
  proOnly?: boolean;
  isPro?: boolean;
  unreadCount?: number;
}

function MenuItem({ icon, label, subtitle, onPress, proOnly, isPro, unreadCount }: MenuItemProps) {
  const locked = proOnly && !isPro;
  return (
    <TouchableOpacity
      style={[styles.item, locked && styles.itemLocked]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.itemIcon}>{icon}</Text>
      <View style={styles.itemText}>
        <View style={styles.itemLabelRow}>
          <Text style={[styles.itemLabel, locked && styles.itemLabelLocked]}>{label}</Text>
          {locked && <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>}
          {!locked && !!unreadCount && (
            <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadCount}</Text></View>
          )}
        </View>
        <Text style={styles.itemSub}>{subtitle}</Text>
      </View>
      <Text style={[styles.itemArrow, locked && styles.itemArrowLocked]}>
        {locked ? '🔒' : '›'}
      </Text>
    </TouchableOpacity>
  );
}

function ProUpgradeBanner() {
  return (
    <View style={styles.upgradeBanner}>
      <Text style={styles.upgradeBannerIcon}>⭐</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.upgradeBannerTitle}>Upgrade to PRO</Text>
        <Text style={styles.upgradeBannerSub}>
          Get full inventory, secondhand records, IMEI tracking and more for Rs 6,000 one-time.
        </Text>
      </View>
    </View>
  );
}

export default function MoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, hasProAccess, installmentPlan } = useAuth();

  const isPro = hasProAccess;
  const isOwner = user?.role === 'admin';

  const [unreadCount, setUnreadCount] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!isPro) return;
    notificationsApi.getUnreadCount()
      .then((res) => setUnreadCount(res.data.data.count))
      .catch(() => {});
  }, [isPro]));

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  function handleProFeature(name: string, navigate: () => void) {
    if (!isPro) {
      Alert.alert(
        '⭐ PRO Feature',
        `"${name}" is only available on the PRO plan.\n\nContact us to upgrade your license.`,
        [{ text: 'OK' }]
      );
      return;
    }
    navigate();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        {user && (
          <View style={styles.userBadge}>
            <Text style={styles.userText}>{user.shopName}</Text>
            <Text style={[styles.planBadge, !isPro && styles.planBadgeSimple]}>{user.plan}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!isPro && <ProUpgradeBanner />}

        <Text style={styles.sectionLabel}>Features</Text>

        <MenuItem
          icon="🔔"
          label="Notifications"
          subtitle="Low stock, team activity & overdue reminders"
          proOnly
          isPro={isPro}
          unreadCount={unreadCount}
          onPress={() => handleProFeature('Notifications', () => navigation.navigate('Notifications'))}
        />
        <MenuItem
          icon="📱"
          label="2nd Hand Records"
          subtitle="Buy, track and sell secondhand phones"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('2nd Hand Records', () => navigation.navigate('SecondhandList'))}
        />
        <MenuItem
          icon="🔍"
          label="IMEI Search"
          subtitle="Check IMEI details and history"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('IMEI Search', () => navigation.navigate('ImeiSearch'))}
        />
        <MenuItem
          icon="📥"
          label="Import Products (CSV)"
          subtitle="Bulk-add hundreds of products at once"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Import Products', () => navigation.navigate('ProductsTab', { screen: 'ImportProducts' }))}
        />
        <MenuItem
          icon="📜"
          label="Import Sales History (CSV)"
          subtitle="Bring in past sales/customers from another app"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Import Sales History', () => navigation.navigate('SalesTab', { screen: 'ImportSalesHistory' }))}
        />
        <MenuItem
          icon="🗄️"
          label="Product Catalog"
          subtitle="View and delete shared barcode catalog entries"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Product Catalog', () => navigation.navigate('Catalog'))}
        />
        <MenuItem
          icon="🧾"
          label="Expenses"
          subtitle="Record and categorize business expenses"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Expenses', () => navigation.navigate('ExpensesList'))}
        />
        <MenuItem
          icon="💵"
          label="Income"
          subtitle="Record service, rental & other income"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Income', () => navigation.navigate('IncomeList'))}
        />
        <MenuItem
          icon="👤"
          label="Customers (CRM)"
          subtitle="Profiles, tags, notes & follow-up reminders"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Customers (CRM)', () => navigation.navigate('CustomersList'))}
        />
        <MenuItem
          icon="🧑‍🤝‍🧑"
          label="Customer Ledger"
          subtitle="Credit sales, payments & outstanding balances"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Customer Ledger', () => navigation.navigate('CustomerLedgerList'))}
        />
        <MenuItem
          icon="🗓️"
          label="Due Installments"
          subtitle="1st/2nd/3rd installment payments, mark paid"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Due Installments', () => navigation.navigate('DueInstallments'))}
        />
        <MenuItem
          icon="🚚"
          label="Supplier Ledger"
          subtitle="Credit purchases, payments & outstanding balances"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Supplier Ledger', () => navigation.navigate('SupplierLedgerList'))}
        />
        <MenuItem
          icon="📋"
          label="Quotations"
          subtitle="Create quotes and convert them to sales"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Quotations', () => navigation.navigate('QuotationsList'))}
        />
        <MenuItem
          icon="📥"
          label="Purchase Orders"
          subtitle="Order stock from suppliers, receive goods (partial OK)"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Purchase Orders', () => navigation.navigate('PurchaseOrdersList'))}
        />
        <MenuItem
          icon="📤"
          label="Sales Orders"
          subtitle="Track confirmed orders through delivery"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Sales Orders', () => navigation.navigate('SalesOrdersList'))}
        />
        <MenuItem
          icon="📉"
          label="Low Stock"
          subtitle="Products at or below their reorder point"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Low Stock', () => navigation.navigate('LowStock'))}
        />
        <MenuItem
          icon="🔀"
          label="Transfer Stock"
          subtitle="Move stock between branches"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Transfer Stock', () => navigation.navigate('TransferStock'))}
        />
        <MenuItem
          icon="📑"
          label="Reports"
          subtitle="Sales, financial, expense/income & inventory reports"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Reports', () => navigation.navigate('ReportsHub'))}
        />

        {isOwner && (
          <>
            <Text style={styles.sectionLabel}>Business Management</Text>
            <MenuItem
              icon="💼"
              label="Business Management"
              subtitle="Chart of accounts, journal entries & trial balance"
              proOnly
              isPro={isPro}
              onPress={() => handleProFeature('Business Management', () => navigation.navigate('BusinessManagement'))}
            />
            <MenuItem
              icon="🏦"
              label="Cash & Bank"
              subtitle="Deposits, withdrawals, transfers & reconciliation"
              proOnly
              isPro={isPro}
              onPress={() => handleProFeature('Cash & Bank', () => navigation.navigate('CashBankList'))}
            />
            <MenuItem
              icon="👥"
              label="Team Members"
              subtitle="Add staff accounts and manage their roles"
              proOnly
              isPro={isPro}
              onPress={() => handleProFeature('Team Members', () => navigation.navigate('TeamMembersList'))}
            />
            <MenuItem
              icon="🔐"
              label="Role Permissions"
              subtitle="Choose what each role can access"
              proOnly
              isPro={isPro}
              onPress={() => handleProFeature('Role Permissions', () => navigation.navigate('RolePermissions'))}
            />
            <MenuItem
              icon="🏬"
              label="Branches"
              subtitle="Manage locations, branch reports & stock assignment"
              proOnly
              isPro={isPro}
              onPress={() => handleProFeature('Branches', () => navigation.navigate('BranchesList'))}
            />
            <MenuItem
              icon="💾"
              label="Backup & Export"
              subtitle="Download a full backup of your shop data"
              proOnly
              isPro={isPro}
              onPress={() => handleProFeature('Backup & Export', () => navigation.navigate('Backup'))}
            />
            <MenuItem
              icon="⚙️"
              label="Settings"
              subtitle="Low stock alerts, shop contact info & invoice notes"
              proOnly
              isPro={isPro}
              onPress={() => handleProFeature('Settings', () => navigation.navigate('Settings'))}
            />
            {!!installmentPlan && (
              <MenuItem
                icon="💳"
                label="Billing"
                subtitle="Track your license installment payments"
                onPress={() => navigation.navigate('BillingStatus')}
              />
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>Account</Text>

        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutLabel}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title:    { fontSize: 22, fontWeight: '800', color: colors.text },
  userBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  userText:  { fontSize: 13, color: colors.textMuted },
  planBadge: {
    fontSize: 11, fontWeight: '700', color: colors.primary,
    backgroundColor: colors.primary + '18', paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 10,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 16, marginBottom: 8, marginLeft: 4,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  itemIcon:  { fontSize: 26, marginRight: 14 },
  itemText:  { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  itemSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemArrow: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
  logoutItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#fee2e2',
  },
  logoutIcon:  { fontSize: 22, marginRight: 14 },
  logoutLabel: { fontSize: 15, fontWeight: '600', color: colors.danger },

  itemLocked:      { opacity: 0.6, backgroundColor: colors.background },
  itemLabelRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemLabelLocked: { color: colors.textMuted },
  itemArrowLocked: { fontSize: 18 },

  proBadge: {
    backgroundColor: '#fef3c7', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#fde68a',
  },
  proBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400e', letterSpacing: 0.5 },

  unreadBadge: {
    backgroundColor: colors.danger, borderRadius: 10,
    minWidth: 18, height: 18, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  planBadgeSimple: {
    color: colors.textMuted,
    backgroundColor: colors.textMuted + '18',
  },

  upgradeBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#fde68a',
  },
  upgradeBannerIcon:  { fontSize: 22 },
  upgradeBannerTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  upgradeBannerSub:   { fontSize: 12, color: '#b45309', lineHeight: 17 },
});
