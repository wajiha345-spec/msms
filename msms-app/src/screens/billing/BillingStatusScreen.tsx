import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Badge } from '../../components/Badge';
import { licenseInstallmentsApi, LicenseInstallmentPlan } from '../../api/licenseInstallments';
import { colors } from '../../theme/colors';

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

function statusBadge(status: string, isOverdue: boolean) {
  if (status === 'PAID')      return <Badge label="Paid" type="success" />;
  if (isOverdue)              return <Badge label="Overdue" type="danger" />;
  if (status === 'SUBMITTED') return <Badge label="Under Review" type="warning" />;
  return <Badge label="Pending" type="info" />;
}

export default function BillingStatusScreen() {
  const navigation = useNavigation<any>();
  const [plan, setPlan] = useState<LicenseInstallmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchStatus() {
    try {
      const res = await licenseInstallmentsApi.getStatus();
      setPlan(res.data.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchStatus(); }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const overdueId = plan?.overdueInstallment?.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Billing</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStatus(); }} />}
      >
        {!plan ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No installment plan on this account.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Plan Status</Text>
              <Text style={styles.summaryValue}>
                {plan.status === 'COMPLETED' ? 'Fully Paid ✓' : `${plan.installments.filter(i => i.status === 'PAID').length} of ${plan.totalInstallments} paid`}
              </Text>
            </View>

            {plan.installments.map((i) => {
              const isOverdue = i.id === overdueId;
              const canPay = i.status === 'PENDING';
              return (
                <View key={i.id} style={styles.installmentCard}>
                  <View style={styles.installmentRow}>
                    <Text style={styles.installmentTitle}>Installment #{i.installmentNumber}</Text>
                    {statusBadge(i.status, isOverdue)}
                  </View>
                  <Text style={styles.installmentAmount}>Rs {i.amount.toLocaleString()}</Text>
                  <Text style={styles.installmentDue}>
                    {i.status === 'PAID' ? `Paid ${fmtDate(i.paidAt)}` : `Due ${fmtDate(i.dueDate)}`}
                  </Text>
                  {canPay && (
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => navigation.navigate('InstallmentPayment', { installmentNumber: i.installmentNumber })}
                    >
                      <Text style={styles.payBtnText}>Submit Payment →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },

  scroll: { padding: 16, paddingBottom: 48 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },

  summaryCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: colors.border, marginBottom: 14, alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },

  installmentCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  installmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  installmentTitle:  { fontSize: 14, fontWeight: '600', color: colors.text },
  installmentAmount: { fontSize: 20, fontWeight: '800', color: colors.text },
  installmentDue:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  payBtn: {
    marginTop: 12, borderWidth: 1, borderColor: colors.primary,
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  payBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
