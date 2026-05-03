import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { purchasesApi, Purchase } from '../../api/purchases';
import { Button } from '../../components/Buttons';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function PurchasesListScreen() {
  const navigation   = useNavigation<any>();
  const { user }     = useAuth();

  if (user?.plan !== 'PRO') {
    return (
      <View style={styles.proGate}>
        <Text style={styles.proGateIcon}>🔒</Text>
        <Text style={styles.proGateTitle}>PRO Feature</Text>
        <Text style={styles.proGateSub}>
          Purchase recording is available on the PRO plan.{'\n'}
          Contact us to upgrade your license.
        </Text>
      </View>
    );
  }
  const [purchases,  setPurchases]  = useState<Purchase[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchPurchases() {
    try {
      const res = await purchasesApi.list();
      setPurchases(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load purchases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchPurchases(); }, []));

  function renderItem({ item }: { item: Purchase }) {
    const date = new Date(item.createdAt);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.product.name}</Text>
            <Text style={styles.brand}>{item.product.brand}</Text>
            {item.supplierName && (
              <Text style={styles.supplier}>🏪 {item.supplierName}</Text>
            )}
          </View>
          <View style={styles.right}>
            <Text style={styles.total}>
              Rs {(item.quantity * item.purchasePrice).toLocaleString()}
            </Text>
            <Text style={styles.qty}>× {item.quantity} units</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.meta}>
            Rs {item.purchasePrice.toLocaleString()}/unit
          </Text>
          <Text style={styles.meta}>
            {date.toLocaleDateString('en-PK')} {date.toLocaleTimeString('en-PK', {
              hour: '2-digit', minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const today = new Date().toDateString();
  const todayPurchases = purchases.filter(
    p => new Date(p.createdAt).toDateString() === today
  );
  const todayCost = todayPurchases.reduce(
    (sum, p) => sum + p.quantity * p.purchasePrice, 0
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Purchases</Text>
        <Button
          label="+ New Purchase"
          onPress={() => navigation.navigate('NewPurchase')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <View style={styles.todayStrip}>
        <View style={styles.todayStat}>
          <Text style={styles.todayValue}>{todayPurchases.length}</Text>
          <Text style={styles.todayLabel}>Today's purchases</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.todayStat}>
          <Text style={styles.todayValue}>Rs {todayCost.toLocaleString()}</Text>
          <Text style={styles.todayLabel}>Total cost</Text>
        </View>
      </View>

      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchPurchases();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No purchases recorded yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingTop:        54,
    paddingBottom:     12,
    backgroundColor:   colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title:        { fontSize: 20, fontWeight: '700', color: colors.text },
  todayStrip: {
    flexDirection:   'row',
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  todayStat:    { flex: 1, alignItems: 'center' },
  todayValue:   { fontSize: 15, fontWeight: '700', color: colors.text },
  todayLabel:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: colors.border },
  list:         { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius:    12,
    padding:         14,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  cardTop:     { flexDirection: 'row', marginBottom: 8 },
  productName: { fontSize: 15, fontWeight: '600', color: colors.text },
  brand:       { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  supplier:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  right:       { alignItems: 'flex-end' },
  total:       { fontSize: 16, fontWeight: '700', color: colors.text },
  qty:         { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBottom:  { flexDirection: 'row', justifyContent: 'space-between' },
  meta:        { fontSize: 12, color: colors.textMuted },
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyText:   { fontSize: 16, color: colors.textMuted, fontWeight: '500' },

  proGate: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.background },
  proGateIcon:  { fontSize: 48, marginBottom: 16 },
  proGateTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 10 },
  proGateSub:   { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});