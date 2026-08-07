import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Button } from '../../components/Buttons';
import { MetricTile } from '../../components/MetricTile';
import { backupApi, BackupExport } from '../../api/backup';
import { colors } from '../../theme/colors';

export default function BackupScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [lastExport, setLastExport] = useState<BackupExport | null>(null);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await backupApi.export();
      const payload = res.data.data;

      const filename = `msms-backup-${payload.shop.name.replace(/[^a-z0-9]+/gi, '-')}-${payload.exportedAt.slice(0, 10)}.json`;
      const file = new File(Paths.document, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(payload, null, 2));

      setLastExport(payload);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save or send your MSMS backup',
        });
      } else {
        Alert.alert(
          'Backup Created ✓',
          `Saved as ${filename} on this device. Sharing isn't available here — you can find it in the app's document storage.`
        );
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Backup & Export</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.introBox}>
          <Text style={styles.introIcon}>💾</Text>
          <Text style={styles.introTitle}>Export all your shop data</Text>
          <Text style={styles.introText}>
            Creates a single JSON file with every product, sale, purchase,
            customer, and business record in your shop — a full backup you
            can save to Drive, email to yourself, or keep as a record. This
            is a read-only export; nothing in your shop is changed.
          </Text>
        </View>

        <Button
          label="Export All Data"
          onPress={handleExport}
          loading={loading}
          style={{ marginBottom: 20 }}
        />

        {lastExport && (
          <>
            <Text style={styles.sectionLabel}>Last Export Summary</Text>
            <Text style={styles.timestamp}>
              {new Date(lastExport.exportedAt).toLocaleString()}
            </Text>
            <View style={styles.grid}>
              <MetricTile icon="📦" label="Products"        value={String(lastExport.counts.products)} />
              <MetricTile icon="🧾" label="Sales"            value={String(lastExport.counts.sales)} />
              <MetricTile icon="🛒" label="Purchases"        value={String(lastExport.counts.purchases)} />
              <MetricTile icon="📱" label="Secondhand"       value={String(lastExport.counts.secondhandRecords)} />
              <MetricTile icon="🧑‍🤝‍🧑" label="Customers"       value={String(lastExport.counts.customers)} />
              <MetricTile icon="📋" label="Quotations"       value={String(lastExport.counts.quotations)} />
              <MetricTile icon="📥" label="Purchase Orders"  value={String(lastExport.counts.purchaseOrders)} />
              <MetricTile icon="📤" label="Sales Orders"     value={String(lastExport.counts.salesOrders)} />
              <MetricTile icon="🏬" label="Branches"         value={String(lastExport.counts.branches)} />
              <MetricTile icon="👥" label="Team Members"     value={String(lastExport.counts.users)} />
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
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
  scroll:  { padding: 16, paddingBottom: 40 },

  introBox: {
    backgroundColor: colors.card, borderRadius: 12, padding: 18,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  introIcon:  { fontSize: 32, marginBottom: 10 },
  introTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  introText:  { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  timestamp: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
