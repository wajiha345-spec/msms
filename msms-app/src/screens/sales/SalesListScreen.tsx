import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { salesApi, Sale } from '../../api/sales';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';
import { useSocket } from '../../context/SocketContext';
import { invoicesApi } from '../../api/invoices';

export default function SalesListScreen() {
  const navigation = useNavigation<any>();
  const { socket } = useSocket();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchSales() {
    try {
      const res = await salesApi.list();
      setSales(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load sales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchSales();
    }, [])
  );

  useEffect(() => {
    if (!socket) return;

    const handleCreated = () => fetchSales();

    socket.on('sale:created', handleCreated);

    return () => {
      socket.off('sale:created', handleCreated);
    };
  }, [socket]);

  function renderItem({ item }: { item: Sale }) {
    const date = new Date(item.createdAt);
    const timeStr = date.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateStr = date.toLocaleDateString('en-PK');

    function openInvoice() {
      const url = invoicesApi.getUrl(item.id);
      WebBrowser.openBrowserAsync(url).catch(() =>
        Alert.alert('Error', 'Could not open invoice. Make sure you are connected.')
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.invoiceNo}>{item.invoiceNo}</Text>
            <Text style={styles.productName} numberOfLines={1}>
              {item.product.name}
            </Text>
            {item.customerName && (
              <Text style={styles.customer}>Customer: {item.customerName}</Text>
            )}
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amount}>
              Rs {item.totalAmount.toLocaleString()}
            </Text>
            <Text
              style={[
                styles.profit,
                item.profit >= 0
                  ? { color: colors.success }
                  : { color: colors.danger },
              ]}
            >
              Rs {item.profit.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.meta}>
            Qty: {item.quantity} · Rs {item.salePrice.toLocaleString()}/unit
          </Text>
          <Text style={styles.meta}>
            {dateStr} {timeStr}
          </Text>
        </View>

        <TouchableOpacity style={styles.invoiceBtn} onPress={openInvoice}>
          <Text style={styles.invoiceBtnText}>View Invoice</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const today = new Date().toDateString();
  const todaySales = sales.filter(
    (s) => new Date(s.createdAt).toDateString() === today
  );
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + s.profit, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales</Text>
        <Button
          label="+ New Sale"
          onPress={() => navigation.navigate('NewSale')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <View style={styles.todayStrip}>
        <View style={styles.todayStat}>
          <Text style={styles.todayValue}>{todaySales.length}</Text>
          <Text style={styles.todayLabel}>Today's sales</Text>
        </View>

        <View style={styles.stripDivider} />

        <View style={styles.todayStat}>
          <Text style={styles.todayValue}>Rs {todayRevenue.toLocaleString()}</Text>
          <Text style={styles.todayLabel}>Revenue</Text>
        </View>

        <View style={styles.stripDivider} />

        <View style={styles.todayStat}>
          <Text style={[styles.todayValue, { color: colors.success }]}>
            Rs {todayProfit.toLocaleString()}
          </Text>
          <Text style={styles.todayLabel}>Profit</Text>
        </View>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSales();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sales yet.</Text>
            <Text style={styles.emptyHint}>
              Tap "+ New Sale" to record your first sale.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  todayStrip: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  todayStat: { flex: 1, alignItems: 'center' },
  todayValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  todayLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: colors.border },
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', marginBottom: 8 },
  invoiceNo: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' },
  productName: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  customer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  amountCol: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '700', color: colors.text },
  profit: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
  emptyHint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  invoiceBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
  },
  invoiceBtnText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 13,
  },
});
