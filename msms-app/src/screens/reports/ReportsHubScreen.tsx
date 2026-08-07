import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

export default function ReportsHubScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Sales & Profit</Text>
        <MenuItem
          icon="📈"
          label="Sales & Profit Summary"
          subtitle="Revenue, profit and top products for any date range"
          onPress={() => navigation.navigate('SalesSummary')}
        />

        <Text style={styles.sectionLabel}>Financial Statements</Text>
        <MenuItem
          icon="📊"
          label="Balance Sheet"
          subtitle="Assets, liabilities & equity as of today"
          onPress={() => navigation.navigate('BalanceSheet')}
        />
        <MenuItem
          icon="📈"
          label="Profit & Loss"
          subtitle="Income vs expense for a date range"
          onPress={() => navigation.navigate('ProfitLoss')}
        />
        <MenuItem
          icon="💧"
          label="Cash Flow"
          subtitle="Cash movement by category for a date range"
          onPress={() => navigation.navigate('CashFlow')}
        />
        <MenuItem
          icon="⚖️"
          label="Trial Balance"
          subtitle="Debit/credit totals across all accounts"
          onPress={() => navigation.navigate('TrialBalance')}
        />

        <Text style={styles.sectionLabel}>Expense & Income</Text>
        <MenuItem
          icon="🧾"
          label="Expense Report"
          subtitle="Spending broken down by category"
          onPress={() => navigation.navigate('ExpenseReport')}
        />
        <MenuItem
          icon="💵"
          label="Income Report"
          subtitle="Earnings broken down by category"
          onPress={() => navigation.navigate('IncomeReport')}
        />

        <Text style={styles.sectionLabel}>Inventory</Text>
        <MenuItem
          icon="📉"
          label="Low Stock"
          subtitle="Products at or below their reorder point"
          onPress={() => navigation.navigate('LowStock')}
        />
        <MenuItem
          icon="🏬"
          label="Branch Reports"
          subtitle="Sales, purchases & stock per branch"
          onPress={() => navigation.navigate('BranchesList')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginTop: 12, marginLeft: 4,
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
});
