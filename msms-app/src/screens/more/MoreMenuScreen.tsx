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
}

function MenuItem({ icon, label, subtitle, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.itemIcon}>{icon}</Text>
      <View style={styles.itemText}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemSub}>{subtitle}</Text>
      </View>
      <Text style={styles.itemArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function MoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        {user && (
          <View style={styles.userBadge}>
            <Text style={styles.userText}>{user.shopName}</Text>
            <Text style={styles.planBadge}>{user.plan}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Features</Text>

        <MenuItem
          icon="📱"
          label="2nd Hand Records"
          subtitle="Buy, track and sell secondhand phones"
          onPress={() => navigation.navigate('SecondhandList')}
        />
        <MenuItem
          icon="🔍"
          label="IMEI Search"
          subtitle="Check IMEI details and history"
          onPress={() => navigation.navigate('ImeiSearch')}
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
});
