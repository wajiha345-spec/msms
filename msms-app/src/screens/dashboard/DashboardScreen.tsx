import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { dashboardApi, DashboardData } from '../../api/dashboard';
import { MetricTile } from '../../components/MetricTile';
import { useAuth }   from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { colors }    from '../../theme/colors';

export default function DashboardScreen() {
  const navigation           = useNavigation<any>();
  const { user, logout }     = useAuth();
  const { socket, connected } = useSocket();

  const [data,       setData]       = useState<DashboardData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const res = await dashboardApi.summary();
      setData(res.data.data);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Reload when screen comes into focus
  useFocusEffect(useCallback(() => { fetchData(); }, []));

  // Realtime: refresh when backend emits dashboard:refresh
  useEffect(() => {
    if (!socket) return;
    socket.on('dashboard:refresh', () => fetchData());
    return () => { socket.off('dashboard:refresh'); };
  }, [socket]);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const today = data?.today;
  const stock = data?.stock;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Good {getTimeOfDay()}, {user?.username} 👋
          </Text>
          <View style={styles.liveRow}>
            <View style={[
              styles.liveDot,
              { backgroundColor: connected ? colors.success : colors.textMuted }
            ]} />
            <Text style={styles.liveText}>
              {connected ? 'Live updates on' : 'Offline'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Today's date strip ── */}
      <View style={styles.dateStrip}>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-PK', {
            weekday: 'long', day: 'numeric',
            month:   'long', year: 'numeric',
          })}
        </Text>
      </View>

      {/* ── Today's metrics ── */}
      <SectionLabel title="Today's Performance" />
      <View style={styles.tilesGrid}>
        <MetricTile
          icon="💰"
          label="Sales"
          value={String(today?.salesCount ?? 0)}
          sub={`Rs ${(today?.revenue ?? 0).toLocaleString()} revenue`}
          accent={colors.primary}
        />
        <MetricTile
          icon="📈"
          label="Profit"
          value={`Rs ${(today?.profit ?? 0).toLocaleString()}`}
          sub="After cost of goods"
          accent={colors.success}
        />
        <MetricTile
          icon="🛒"
          label="Purchases"
          value={String(today?.purchasesCount ?? 0)}
          sub={`Rs ${(today?.cost ?? 0).toLocaleString()} spent`}
          accent={colors.warning}
        />
        <MetricTile
          icon="💵"
          label="Net Today"
          value={`Rs ${((today?.profit ?? 0) - (today?.cost ?? 0)).toLocaleString()}`}
          sub="Profit minus purchases"
          accent={
            ((today?.profit ?? 0) - (today?.cost ?? 0)) >= 0
              ? colors.success : colors.danger
          }
        />
      </View>

      {/* ── Stock overview ── */}
      <SectionLabel title="Inventory" />
      <View style={styles.tilesGrid}>
        <MetricTile
          icon="📦"
          label="Total Products"
          value={String(stock?.totalProducts ?? 0)}
          accent={colors.info ?? '#3B82F6'}
        />
        <MetricTile
          icon="🆕"
          label="New In Stock"
          value={String(stock?.newStock ?? 0)}
          accent={colors.primary}
        />
        <MetricTile
          icon="♻️"
          label="Secondhand"
          value={String(stock?.secondhandStock ?? 0)}
          sub="Available units"
          accent={colors.warning}
        />
      </View>

      {/* ── Recent sales ── */}
      <SectionLabel title="Recent Sales" />

      {data?.recentSales.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No sales recorded yet.</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SalesTab', { screen: 'NewSale' })}
          >
            <Text style={styles.emptyAction}>Record your first sale →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        data?.recentSales.map((sale) => (
          <TouchableOpacity
            key={sale.id}
            style={styles.saleCard}
            onPress={() => navigation.navigate('SalesTab', { screen: 'SalesList' })}
            activeOpacity={0.75}
          >
            <View style={styles.saleLeft}>
              <Text style={styles.saleName} numberOfLines={1}>
                {sale.product.name}
              </Text>
              <Text style={styles.saleInvoice}>{sale.invoiceNo}</Text>
              {sale.customerName && (
                <Text style={styles.saleCustomer}>👤 {sale.customerName}</Text>
              )}
            </View>
            <View style={styles.saleRight}>
              <Text style={styles.saleAmount}>
                Rs {sale.totalAmount.toLocaleString()}
              </Text>
              <Text style={[
                styles.saleProfit,
                sale.profit >= 0 ? { color: colors.success } : { color: colors.danger }
              ]}>
                +Rs {sale.profit.toLocaleString()}
              </Text>
              <Text style={styles.saleTime}>
                {new Date(sale.createdAt).toLocaleTimeString('en-PK', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Quick action buttons */}
      <SectionLabel title="Quick Actions" />
      <View style={styles.quickActions}>
        <QuickBtn
          icon="💰"
          label="New Sale"
          color={colors.primary}
          onPress={() => navigation.navigate('SalesTab', { screen: 'NewSale' })}
        />
        <QuickBtn
          icon="🛒"
          label="New Purchase"
          color={colors.warning}
          onPress={() => navigation.navigate('PurchasesTab', { screen: 'NewPurchase' })}
        />
        <QuickBtn
          icon="📱"
          label="Add 2nd Hand"
          color="#8B5CF6"
          onPress={() => navigation.navigate('MoreTab', { screen: 'SecondhandList' })}
        />
        <QuickBtn
          icon="🔍"
          label="IMEI Search"
          color="#06B6D4"
          onPress={() => navigation.navigate('MoreTab', { screen: 'ImeiSearch' })}
        />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={secStyles.label}>{title}</Text>
  );
}
const secStyles = StyleSheet.create({
  label: {
    fontSize:      13,
    fontWeight:    '600',
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  10,
    marginTop:     20,
    paddingHorizontal: 16,
  },
});

function QuickBtn({
  icon, label, color, onPress,
}: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[quickStyles.btn, { backgroundColor: color + '18', borderColor: color + '40' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={quickStyles.icon}>{icon}</Text>
      <Text style={[quickStyles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const quickStyles = StyleSheet.create({
  btn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 14,
    borderRadius:    12,
    borderWidth:     1,
  },
  icon:  { fontSize: 22, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '600' },
});

// ── Helpers ──────────────────────────────────────────────────────
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  scroll:      { paddingBottom: 30 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: colors.textMuted, fontSize: 13 },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingHorizontal: 16,
    paddingTop:        54,
    paddingBottom:     14,
    backgroundColor:   colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting:    { fontSize: 17, fontWeight: '700', color: colors.text },
  liveRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  liveDot:     { width: 7, height: 7, borderRadius: 4 },
  liveText:    { fontSize: 11, color: colors.textMuted },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       colors.danger + '60',
    backgroundColor:   colors.danger + '10',
  },
  logoutText:  { color: colors.danger, fontSize: 13, fontWeight: '500' },
  dateStrip: {
    backgroundColor:   colors.primary + '12',
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  dateText:   { fontSize: 12, color: colors.primary, fontWeight: '500' },
  tilesGrid: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    gap:               10,
    paddingHorizontal: 16,
  },
  saleCard: {
    flexDirection:     'row',
    backgroundColor:   colors.card,
    marginHorizontal:  16,
    marginBottom:      8,
    borderRadius:      12,
    padding:           12,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  saleLeft:    { flex: 1 },
  saleName:    { fontSize: 14, fontWeight: '600', color: colors.text },
  saleInvoice: { fontSize: 10, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  saleCustomer:{ fontSize: 11, color: colors.textMuted, marginTop: 2 },
  saleRight:   { alignItems: 'flex-end', justifyContent: 'center' },
  saleAmount:  { fontSize: 14, fontWeight: '700', color: colors.text },
  saleProfit:  { fontSize: 12, fontWeight: '500', marginTop: 2 },
  saleTime:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  emptyBox: {
    marginHorizontal: 16,
    padding:          24,
    backgroundColor:  colors.card,
    borderRadius:     12,
    alignItems:       'center',
    borderWidth:      1,
    borderColor:      colors.border,
  },
  emptyText:   { color: colors.textMuted, fontSize: 14 },
  emptyAction: { color: colors.primary, fontSize: 13, fontWeight: '500', marginTop: 8 },
  quickActions: {
    flexDirection:     'row',
    gap:               8,
    paddingHorizontal: 16,
  },
});