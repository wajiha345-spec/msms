import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

interface MenuItemProps {
  icon: string;
  label: string;
  subtitle: string;
  onPress: () => void;
  proOnly?: boolean;
  isPro?: boolean;
}

function MenuItem({ icon, label, subtitle, onPress, proOnly, isPro }: MenuItemProps) {
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
  const { user, logout } = useAuth();

  const isPro = user?.plan === 'PRO';

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
          icon="🗄️"
          label="Product Catalog"
          subtitle="View and delete shared barcode catalog entries"
          proOnly
          isPro={isPro}
          onPress={() => handleProFeature('Product Catalog', () => navigation.navigate('Catalog'))}
        />

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
