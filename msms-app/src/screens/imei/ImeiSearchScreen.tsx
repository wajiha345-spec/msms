import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView,
  StyleSheet, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { imeiApi, ImeiSearchResult } from '../../api/imei';
import { Badge }  from '../../components/Badge';
import { colors } from '../../theme/colors';

export default function ImeiSearchScreen() {
  const navigation  = useNavigation<any>();
  const [query,     setQuery]     = useState('');
  const [result,    setResult]    = useState<ImeiSearchResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [searched,  setSearched]  = useState(false);

  async function handleSearch() {
    if (query.trim().length < 4) {
      Alert.alert('Too short', 'Enter at least 4 digits to search');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await imeiApi.search(query.trim());
      setResult(res.data.data);
    } catch (e: any) {
      Alert.alert('Search failed', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>IMEI Search</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter full IMEI or last 4 digits..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          keyboardType="numeric"
          maxLength={15}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoFocus
        />
        <TouchableOpacity
          style={[styles.searchBtn, (!query || loading) && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={!query || loading}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching all records...</Text>
        </View>
      )}

      {!loading && searched && result && (
        <ScrollView contentContainerStyle={styles.results}>

          {/* No results */}
          {!result.found && (
            <View style={styles.noResult}>
              <Text style={styles.noResultIcon}>🔍</Text>
              <Text style={styles.noResultText}>No records found</Text>
              <Text style={styles.noResultHint}>
                No product, sale, or secondhand record matches "{result.query}"
              </Text>
            </View>
          )}

          {/* Products */}
          {result.products.length > 0 && (
            <Section title="Inventory">
              {result.products.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.resultCard}
                  onPress={() => navigation.navigate('ProductsTab', {
                    screen: 'ProductDetail', params: { id: p.id }
                  })}
                >
                  <View style={styles.resultTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{p.name}</Text>
                      <Text style={styles.resultSub}>{p.brand}</Text>
                      {p.imei && (
                        <Text style={styles.imei}>IMEI: {p.imei}</Text>
                      )}
                    </View>
                    <Badge
                      label={p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                      type={p.stock > 0 ? 'success' : 'danger'}
                    />
                  </View>
                  <Text style={styles.tapHint}>Tap to view →</Text>
                </TouchableOpacity>
              ))}
            </Section>
          )}

          {/* Sales */}
          {result.sales.length > 0 && (
            <Section title="Sale History">
              {result.sales.map((s) => (
                <View key={s.id} style={styles.resultCard}>
                  <View style={styles.resultTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{s.invoiceNo}</Text>
                      <Text style={styles.resultSub}>{s.product.name}</Text>
                      {s.customerName && (
                        <Text style={styles.resultSub}>👤 {s.customerName}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.amount}>
                        Rs {s.totalAmount.toLocaleString()}
                      </Text>
                      <Text style={styles.resultDate}>
                        {new Date(s.createdAt).toLocaleDateString('en-PK')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Section>
          )}

          {/* Secondhand records */}
          {result.secondhandRecords.length > 0 && (
            <Section title="Secondhand Records">
              {result.secondhandRecords.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.resultCard}
                  onPress={() => navigation.navigate('SecondhandDetail', { id: r.id })}
                >
                  <View style={styles.resultTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{r.mobileName}</Text>
                      <Text style={styles.resultSub}>{r.brand}</Text>
                      <Text style={styles.resultSub}>👤 {r.sellerName}</Text>
                      <Text style={styles.resultSub}>🪪 {r.sellerCnic}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge
                        label={r.isSold ? 'Sold' : 'In Stock'}
                        type={r.isSold ? 'default' : 'success'}
                      />
                      <Text style={styles.amount}>
                        Rs {r.purchasePrice.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tapHint}>Tap to view full record →</Text>
                </TouchableOpacity>
              ))}
            </Section>
          )}

        </ScrollView>
      )}

      {/* Initial state */}
      {!searched && (
        <View style={styles.hint}>
          <Text style={styles.hintIcon}>📱</Text>
          <Text style={styles.hintText}>Search any IMEI number</Text>
          <Text style={styles.hintSub}>
            Enter the full 15-digit IMEI or just the last 4 digits.
            Results show inventory, sales, and secondhand records.
          </Text>
        </View>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={secS.wrapper}>
      <Text style={secS.title}>{title}</Text>
      {children}
    </View>
  );
}
const secS = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  title: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
});

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  header: {
    paddingHorizontal: 16,
    paddingTop:        54,
    paddingBottom:     14,
    backgroundColor:   colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title:          { fontSize: 20, fontWeight: '700', color: colors.text },
  searchBox: {
    flexDirection:   'row',
    gap:             10,
    padding:         12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex:            1,
    backgroundColor: colors.background,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         11,
    fontSize:        15,
    color:           colors.text,
    fontFamily:      'monospace',
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius:    10,
    paddingHorizontal: 18,
    justifyContent:  'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText:     { color: '#fff', fontWeight: '600', fontSize: 14 },
  results:           { padding: 16, paddingBottom: 40 },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius:    10,
    padding:         12,
    marginBottom:    8,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  resultTop:    { flexDirection: 'row', marginBottom: 4 },
  resultName:   { fontSize: 14, fontWeight: '600', color: colors.text },
  resultSub:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  imei:         { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  amount:       { fontSize: 14, fontWeight: '700', color: colors.text },
  resultDate:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  tapHint:      { fontSize: 11, color: colors.primary, marginTop: 4 },
  loadingText:  { color: colors.textMuted, marginTop: 10, fontSize: 13 },
  noResult:     { alignItems: 'center', paddingTop: 40 },
  noResultIcon: { fontSize: 40, marginBottom: 10 },
  noResultText: { fontSize: 18, fontWeight: '600', color: colors.text },
  noResultHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center',
                  marginTop: 6, paddingHorizontal: 20 },
  hint:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  hintIcon:     { fontSize: 48, marginBottom: 14 },
  hintText:     { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  hintSub: {
    fontSize:   13, color: colors.textMuted, textAlign: 'center', lineHeight: 20,
  },
});