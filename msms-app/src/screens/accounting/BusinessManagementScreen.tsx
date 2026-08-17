import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
}

function MenuItem({ icon, label, subtitle, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={colors.primary} style={styles.itemIcon} />
      <View style={styles.itemText}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemSub}>{subtitle}</Text>
      </View>
      <Text style={styles.itemArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function BusinessManagementScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnRow}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Business Management</Text>
        <Text style={styles.subtitle}>Accounting & financial records</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Accounting</Text>

        <MenuItem
          icon="list-outline"
          label="Chart of Accounts"
          subtitle="View and manage your accounts"
          onPress={() => navigation.navigate('ChartOfAccounts')}
        />
        <MenuItem
          icon="create-outline"
          label="Journal Entries"
          subtitle="Record and review double-entry transactions"
          onPress={() => navigation.navigate('JournalEntries')}
        />
        <MenuItem
          icon="scale-outline"
          label="Trial Balance"
          subtitle="Debit/credit totals across all accounts"
          onPress={() => navigation.navigate('TrialBalance')}
        />

        <Text style={styles.sectionLabel}>Reports</Text>

        <MenuItem
          icon="bar-chart-outline"
          label="Balance Sheet"
          subtitle="Assets, liabilities & equity as of today"
          onPress={() => navigation.navigate('BalanceSheet')}
        />
        <MenuItem
          icon="stats-chart-outline"
          label="Profit & Loss"
          subtitle="Income vs expense for a date range"
          onPress={() => navigation.navigate('ProfitLoss')}
        />
        <MenuItem
          icon="water-outline"
          label="Cash Flow"
          subtitle="Cash movement by category for a date range"
          onPress={() => navigation.navigate('CashFlow')}
        />
        <MenuItem
          icon="lock-closed-outline"
          label="Closing Entry"
          subtitle="Close a period's income/expense into equity"
          onPress={() => navigation.navigate('ClosingEntry')}
        />
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
  backBtnRow: { marginBottom: 10 },
  backBtn:  { color: colors.primary, fontSize: 15, fontWeight: '500' },
  title:    { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginLeft: 4,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  itemIcon:  { marginRight: 14 },
  itemText:  { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  itemSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemArrow: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
});
