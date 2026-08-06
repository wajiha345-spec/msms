import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  notificationsApi, Notification, AttentionItems,
} from '../../api/notifications';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

function typeIcon(type: string) {
  if (type === 'LOW_STOCK')              return '📉';
  if (type === 'SALE_RECORDED')          return '🧾';
  if (type === 'PURCHASE_RECORDED')      return '📦';
  if (type === 'PURCHASE_ORDER_RECEIVED') return '📥';
  return '🔔';
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

function timeAgo(d: string) {
  const diffMs = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [attention,  setAttention]  = useState<AttentionItems | null>(null);
  const [feed,       setFeed]       = useState<Notification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy,       setBusy]       = useState(false);

  async function fetchAll() {
    try {
      const [attentionRes, feedRes] = await Promise.all([
        notificationsApi.getAttentionItems(),
        notificationsApi.list(),
      ]);
      setAttention(attentionRes.data.data);
      setFeed(feedRes.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  async function handleTapNotification(n: Notification) {
    if (n.isRead) return;
    try {
      await notificationsApi.markAsRead(n.id);
      setFeed((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    } catch {
      // silent — non-critical
    }
  }

  async function handleMarkAllRead() {
    setBusy(true);
    try {
      await notificationsApi.markAllAsRead();
      setFeed((prev) => prev.map((x) => ({ ...x, isRead: true })));
    } catch {
      Alert.alert('Error', 'Could not mark all as read');
    } finally {
      setBusy(false);
    }
  }

  const unreadCount = feed.filter((n) => !n.isRead).length;
  const hasAttention = attention && (attention.overdueInstallments.length > 0 || attention.overdueFollowUps.length > 0);

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} disabled={busy || unreadCount === 0}>
          <Text style={[styles.markAllBtn, unreadCount === 0 && styles.markAllBtnDisabled]}>
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} />
        }
        ListHeaderComponent={
          hasAttention ? (
            <View style={styles.attentionSection}>
              <Text style={styles.sectionLabel}>Needs Attention</Text>

              {attention!.overdueInstallments.map((it) => (
                <TouchableOpacity
                  key={it.saleId}
                  style={styles.attentionCard}
                  onPress={() => navigation.navigate('CustomerStatement', { phone: it.customerPhone, name: it.customerName })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.attentionIcon}>⏰</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attentionTitle}>
                      Installment overdue — {it.customerName || it.customerPhone}
                    </Text>
                    <Text style={styles.attentionSub}>
                      {it.invoiceNo} · Rs {it.pendingAmount.toLocaleString()} · due {fmtDate(it.dueDate)}
                    </Text>
                  </View>
                  <Badge label="Overdue" type="danger" />
                </TouchableOpacity>
              ))}

              {attention!.overdueFollowUps.map((it) => (
                <TouchableOpacity
                  key={it.interactionId}
                  style={styles.attentionCard}
                  onPress={() => navigation.navigate('CustomerProfile', { id: it.customer.id })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.attentionIcon}>📅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attentionTitle}>
                      Follow-up overdue — {it.customer.name}
                    </Text>
                    <Text style={styles.attentionSub} numberOfLines={1}>
                      {it.text} · due {fmtDate(it.followUpDate)}
                    </Text>
                  </View>
                  <Badge label="Overdue" type="danger" />
                </TouchableOpacity>
              ))}

              <Text style={styles.sectionLabel}>Recent Activity</Text>
            </View>
          ) : (
            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Recent Activity</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.isRead && styles.cardUnread]}
            onPress={() => handleTapNotification(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{typeIcon(item.type)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMessage}>{item.message}</Text>
              <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !hasAttention ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>You're all caught up.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 90 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  markAllBtn:         { fontSize: 12, fontWeight: '600', color: colors.primary, width: 90, textAlign: 'right' },
  markAllBtnDisabled: { color: colors.textMuted },

  list: { padding: 12, paddingBottom: 40 },

  attentionSection: { marginBottom: 4 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4,
  },
  attentionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 10,
  },
  attentionIcon:  { fontSize: 20 },
  attentionTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  attentionSub:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  cardUnread:  { backgroundColor: '#EEF2FF', borderColor: colors.primary + '40' },
  icon:        { fontSize: 20 },
  cardTitle:   { fontSize: 14, fontWeight: '600', color: colors.text },
  cardMessage: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardTime:    { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
