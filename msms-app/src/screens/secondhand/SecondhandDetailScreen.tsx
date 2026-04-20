import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Linking
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { secondhandApi, SecondhandRecord } from '../../api/secondhand';
import { Badge }  from '../../components/Badge';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

export default function SecondhandDetailScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { id }     = route.params as { id: string };

  const [record,  setRecord]  = useState<SecondhandRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      secondhandApi.getOne(id)
        .then((res) => setRecord(res.data.data))
        .catch(() => Alert.alert('Error', 'Failed to load record'))
        .finally(() => setLoading(false));
    }, [id])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!record) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{record.mobileName}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Status */}
        <View style={styles.badgeRow}>
          <Badge
            label={record.isSold ? 'Sold' : 'Available'}
            type={record.isSold ? 'default' : 'success'}
          />
          <Badge label={record.brand} type="info" />
        </View>

        {/* Phone info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phone Details</Text>
          <Row label="Name"     value={record.mobileName} />
          <Row label="Brand"    value={record.brand} />
          {record.imei && <Row label="IMEI" value={record.imei} mono />}
          <Row label="Bought for" value={`Rs ${record.purchasePrice.toLocaleString()}`} />
          {record.product && !record.isSold && (
            <Row
              label="Selling for"
              value={`Rs ${record.product.salePrice.toLocaleString()}`}
            />
          )}
          {record.notes && <Row label="Notes" value={record.notes} />}
          <Row
            label="Date added"
            value={new Date(record.createdAt).toLocaleDateString('en-PK')}
          />
        </View>

        {/* Seller info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Seller Information</Text>
          <Row label="Name"  value={record.sellerName} />
          <Row label="CNIC"  value={record.sellerCnic} mono />
          <Row label="Phone" value={record.sellerPhone} />
          {/* Tap phone number to call */}
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${record.sellerPhone}`)}
          >
            <Text style={styles.callBtnText}>📞 Call Seller</Text>
          </TouchableOpacity>
        </View>

        {/* Photos */}
        {(record.sellerPhotoUrl || record.cnicPhotoUrl) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <View style={styles.photosRow}>
              {record.sellerPhotoUrl && (
                <View style={styles.photoBox}>
                  <Image
                    source={{ uri: record.sellerPhotoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <Text style={styles.photoLabel}>Seller</Text>
                </View>
              )}
              {record.cnicPhotoUrl && (
                <View style={styles.photoBox}>
                  <Image
                    source={{ uri: record.cnicPhotoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <Text style={styles.photoLabel}>CNIC</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action: sell this phone */}
        {!record.isSold && record.product && (
          <Button
            label="Sell This Phone"
            onPress={() => navigation.navigate('SalesTab', {
              screen: 'NewSale',
              params: {
                preselectedProductId: record.productId,
                secondhandId: record.id,
              },
            })}
          />
        )}

      </ScrollView>
    </View>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={rowS.row}>
      <Text style={rowS.label}>{label}</Text>
      <Text style={[rowS.value, mono && rowS.mono]} numberOfLines={2}>{value}</Text>
    </View>
  );
}
const rowS = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between',
           paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 13, color: colors.textMuted, flex: 1 },
  value: { fontSize: 13, color: colors.text, fontWeight: '500',
           flex: 2, textAlign: 'right' },
  mono:  { fontFamily: 'monospace', fontSize: 12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 16,
    paddingTop:        54,
    paddingBottom:     14,
    backgroundColor:   colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn:    { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:      { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  content:    { padding: 16, gap: 14, paddingBottom: 40 },
  badgeRow:   { flexDirection: 'row', gap: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius:    12,
    padding:         14,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  callBtn: {
    marginTop:       10,
    padding:         10,
    borderRadius:    8,
    backgroundColor: '#F0FDF4',
    borderWidth:     1,
    borderColor:     '#BBF7D0',
    alignItems:      'center',
  },
  callBtnText:  { color: colors.success, fontWeight: '600', fontSize: 14 },
  photosRow:    { flexDirection: 'row', gap: 10 },
  photoBox:     { flex: 1 },
  photo:        { width: '100%', height: 130, borderRadius: 8 },
  photoLabel:   { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});