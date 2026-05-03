/**
 * ImeiVerifyPanel
 *
 * Runs IMEI verification (TAC device lookup + PTA DIRBS check) and renders
 * a compact result panel.
 *
 * Props:
 *   imei          — the 15-digit IMEI to verify
 *   onResult      — called once checks complete; parent can auto-fill fields
 *   mode          — 'new' shows only device info (no PTA block gate)
 *                   'secondhand' shows full panel + blocks save on rejected status
 *   onBlockChange — called with true/false when the "blocked" gate changes
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking,
} from 'react-native';
import { imeiVerifyApi, ImeiVerifyResult, PtaStatusCode } from '../api/imeiVerify';
import { colors } from '../theme/colors';

// PTA DIRBS public portal — user can verify IMEI status directly
const PTA_PORTAL_URL = 'https://dirbs.pta.gov.pk/';

interface Props {
  imei:           string;
  mode:           'new' | 'secondhand';
  onResult?:      (result: ImeiVerifyResult) => void;
  onBlockChange?: (blocked: boolean) => void;
}

type PanelState = 'idle' | 'loading' | 'done' | 'error';

// ── PTA badge colours ────────────────────────────────────────────────────────
const PTA_COLORS: Record<PtaStatusCode, { bg: string; text: string; border: string }> = {
  compliant:       { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  provisional:     { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  non_compliant:   { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  not_registered:  { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  stolen:          { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  blocked:         { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  unknown:         { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
};

const RECOMMENDATION_META = {
  accept:  { icon: '✅', text: 'Safe to accept',       bg: '#f0fdf4', border: '#bbf7d0', textColor: '#166534' },
  caution: { icon: '⚠️', text: 'Proceed with caution', bg: '#fffbeb', border: '#fde68a', textColor: '#92400e' },
  reject:  { icon: '🚫', text: 'DO NOT accept',         bg: '#fef2f2', border: '#fecaca', textColor: '#991b1b' },
};

export default function ImeiVerifyPanel({
  imei, mode, onResult, onBlockChange,
}: Props) {
  const [state,   setState]   = useState<PanelState>('idle');
  const [result,  setResult]  = useState<ImeiVerifyResult | null>(null);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  useEffect(() => {
    if (imei.length !== 15) {
      setState('idle');
      setResult(null);
      return;
    }
    runCheck();
  }, [imei]);

  // Tell parent whether the form should be blocked
  useEffect(() => {
    if (!onBlockChange) return;
    if (!result) { onBlockChange(false); return; }
    const isRejected = result.recommendation === 'reject';
    onBlockChange(isRejected && !overrideConfirmed);
  }, [result, overrideConfirmed]);

  async function runCheck() {
    setState('loading');
    setResult(null);
    setOverrideConfirmed(false);
    try {
      const res = await imeiVerifyApi.check(imei);
      const data = res.data.data;
      setResult(data);
      setState('done');
      onResult?.(data);
    } catch {
      setState('error');
    }
  }

  if (state === 'idle') return null;

  if (state === 'loading') {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.loadingText}>Looking up device info…</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>⚠️ Verification service unavailable — proceed manually</Text>
        <TouchableOpacity onPress={runCheck}>
          <Text style={styles.retryLink}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!result) return null;

  const ptaColors = PTA_COLORS[result.pta.status];
  const recMeta   = RECOMMENDATION_META[result.recommendation];
  const isRejected = result.recommendation === 'reject';
  const blocked    = isRejected && !overrideConfirmed;

  return (
    <View style={styles.panel}>

      {/* ── Device info row ── */}
      <View style={styles.deviceRow}>
        <Text style={styles.deviceIcon}>📱</Text>
        <View style={styles.deviceText}>
          {result.device.found ? (
            result.device.source === 'tac_prefix' ? (
              <>
                <Text style={styles.deviceName}>{result.device.brand}</Text>
                <Text style={styles.deviceSub}>Brand from TAC prefix · enter model manually</Text>
              </>
            ) : (
              <>
                <Text style={styles.deviceName}>
                  {result.device.brand}{result.device.model ? ` ${result.device.model}` : ''}
                </Text>
                <Text style={styles.deviceSub}>Auto-filled from GSMA database · verify below</Text>
              </>
            )
          ) : (
            <>
              <Text style={styles.deviceUnknown}>Device not found in database</Text>
              <Text style={styles.deviceSub}>Enter brand and model manually</Text>
            </>
          )}
        </View>
        {result.device.found && (
          <View style={[
            styles.confidenceBadge,
            result.device.source === 'tac_prefix' && styles.confidenceBadgeLow,
          ]}>
            <Text style={[
              styles.confidenceText,
              result.device.source === 'tac_prefix' && styles.confidenceTextLow,
            ]}>
              {result.device.source === 'tac_prefix' ? 'TAC' : 'GSMA'}
            </Text>
          </View>
        )}
      </View>

      {/* ── PTA status ── */}
      {result.pta.checked ? (
        <View style={[styles.ptaRow, { backgroundColor: ptaColors.bg, borderColor: ptaColors.border }]}>
          <View style={styles.ptaLeft}>
            <Text style={[styles.ptaLabel, { color: ptaColors.text }]}>PTA / DIRBS Status</Text>
            <Text style={[styles.ptaValue, { color: ptaColors.text }]}>{result.pta.label}</Text>
          </View>
        </View>
      ) : (
        /* PTA API unavailable — show direct portal button instead */
        <TouchableOpacity
          style={styles.ptaPortalRow}
          onPress={() => Linking.openURL(`${PTA_PORTAL_URL}`)}
          activeOpacity={0.75}
        >
          <View style={styles.ptaPortalLeft}>
            <Text style={styles.ptaPortalLabel}>PTA / DIRBS Status</Text>
            <Text style={styles.ptaPortalHint}>Tap to verify on PTA official website</Text>
          </View>
          <View style={styles.ptaPortalBtn}>
            <Text style={styles.ptaPortalBtnText}>Check PTA →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── IMEI validity warning ── */}
      {!result.isValid && (
        <View style={styles.warnRow}>
          <Text style={styles.warnText}>⚠️ IMEI failed Luhn check — may be mis-typed</Text>
        </View>
      )}

      {/* ── Recommendation (secondhand mode only) ── */}
      {mode === 'secondhand' && (
        <View style={[styles.recBox, { backgroundColor: recMeta.bg, borderColor: recMeta.border }]}>
          <Text style={[styles.recText, { color: recMeta.textColor }]}>
            {recMeta.icon}  {recMeta.text}
          </Text>
        </View>
      )}

      {/* ── Override for blocked/stolen (secondhand mode) ── */}
      {mode === 'secondhand' && isRejected && (
        <View style={styles.overrideBox}>
          <Text style={styles.overrideWarning}>
            🚫  This device is {result.pta.status === 'stolen' ? 'reported stolen' : 'blocked by PTA'}.
            Accepting stolen or blocked phones is illegal and can result in serious consequences.
          </Text>
          <TouchableOpacity
            style={styles.overrideCheckRow}
            onPress={() => setOverrideConfirmed(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, overrideConfirmed && styles.checkboxChecked]}>
              {overrideConfirmed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.overrideCheckLabel}>
              I understand the risk and confirm this phone is not stolen
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 10,
    padding: 14, marginVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  loadingText: { fontSize: 13, color: colors.textMuted },

  errorBox: {
    backgroundColor: '#fff7ed', borderRadius: 10, padding: 12,
    marginVertical: 8, borderWidth: 1, borderColor: '#fed7aa',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  errorText:  { fontSize: 12, color: '#9a3412', flex: 1 },
  retryLink:  { fontSize: 12, color: colors.primary, fontWeight: '700', marginLeft: 8 },

  panel: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    marginVertical: 8,
  },

  // Device row
  deviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, padding: 14,
  },
  deviceIcon:    { fontSize: 28 },
  deviceText:    { flex: 1 },
  deviceName:    { fontSize: 15, fontWeight: '700', color: colors.text },
  deviceUnknown: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  deviceSub:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  confidenceBadge: {
    backgroundColor: '#dbeafe', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  confidenceBadgeLow: {
    backgroundColor: '#fef9c3',
  },
  confidenceText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },
  confidenceTextLow: { color: '#854d0e' },

  // PTA — checked status row
  ptaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  ptaLeft:  { flex: 1 },
  ptaLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  ptaValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  // PTA — portal fallback row (when API unavailable)
  ptaPortalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  ptaPortalLeft:    { flex: 1 },
  ptaPortalLabel:   { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: '#475569' },
  ptaPortalHint:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  ptaPortalBtn: {
    backgroundColor: '#1e40af', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, marginLeft: 10,
  },
  ptaPortalBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Warnings
  warnRow: {
    backgroundColor: '#fffbeb', padding: 10,
    borderTopWidth: 1, borderTopColor: '#fde68a',
  },
  warnText: { fontSize: 12, color: '#92400e' },

  // Recommendation
  recBox: {
    padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  recText: { fontSize: 14, fontWeight: '700' },

  // Override
  overrideBox: {
    backgroundColor: '#fef2f2', padding: 14,
    borderTopWidth: 1, borderTopColor: '#fecaca',
    gap: 12,
  },
  overrideWarning: { fontSize: 13, color: '#991b1b', lineHeight: 19 },
  overrideCheckRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#991b1b',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#991b1b' },
  checkmark:       { color: '#fff', fontSize: 14, fontWeight: '700' },
  overrideCheckLabel: { flex: 1, fontSize: 13, color: '#991b1b', lineHeight: 19 },
});
