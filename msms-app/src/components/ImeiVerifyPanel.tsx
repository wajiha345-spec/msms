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
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openUrl } from '../utils/openUrl';
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
  compliant:       { bg: '#EDE6FB', text: '#34208C', border: '#C9BEF2' },
  provisional:     { bg: '#EDE6FB', text: '#34208C', border: '#C9BEF2' },
  non_compliant:   { bg: '#EDE6FB', text: '#34208C', border: '#C9BEF2' },
  not_registered:  { bg: '#EDE6FB', text: '#34208C', border: '#C9BEF2' },
  stolen:          { bg: '#EDE6FB', text: '#34208C', border: '#C9BEF2' },
  blocked:         { bg: '#EDE6FB', text: '#34208C', border: '#C9BEF2' },
  unknown:         { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
};

const RECOMMENDATION_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; text: string; bg: string; border: string; textColor: string }> = {
  accept:  { icon: 'checkmark-circle-outline', text: 'Safe to accept',       bg: '#EDE6FB', border: '#C9BEF2', textColor: '#34208C' },
  caution: { icon: 'warning-outline',          text: 'Proceed with caution', bg: '#EDE6FB', border: '#C9BEF2', textColor: '#34208C' },
  reject:  { icon: 'ban-outline',              text: 'DO NOT accept',        bg: '#EDE6FB', border: '#C9BEF2', textColor: '#34208C' },
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
        <Ionicons name="warning-outline" size={14} color="#34208C" />
        <Text style={styles.errorText}>Verification service unavailable — proceed manually</Text>
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
        <Ionicons name="phone-portrait-outline" size={26} color={colors.textMuted} />
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
          onPress={() => openUrl(PTA_PORTAL_URL)}
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
          <Ionicons name="warning-outline" size={14} color="#34208C" />
          <Text style={styles.warnText}>IMEI failed Luhn check — may be mis-typed</Text>
        </View>
      )}

      {/* ── Recommendation (secondhand mode only) ── */}
      {mode === 'secondhand' && (
        <View style={[styles.recBox, { backgroundColor: recMeta.bg, borderColor: recMeta.border }]}>
          <Ionicons name={recMeta.icon} size={18} color={recMeta.textColor} />
          <Text style={[styles.recText, { color: recMeta.textColor }]}>
            {recMeta.text}
          </Text>
        </View>
      )}

      {/* ── Override for blocked/stolen (secondhand mode) ── */}
      {mode === 'secondhand' && isRejected && (
        <View style={styles.overrideBox}>
          <View style={styles.overrideWarningRow}>
            <Ionicons name="ban-outline" size={16} color="#34208C" style={styles.overrideWarningIcon} />
            <Text style={styles.overrideWarning}>
              This device is {result.pta.status === 'stolen' ? 'reported stolen' : 'blocked by PTA'}.
              Accepting stolen or blocked phones is illegal and can result in serious consequences.
            </Text>
          </View>
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
    backgroundColor: '#EDE6FB', borderRadius: 10, padding: 12,
    marginVertical: 8, borderWidth: 1, borderColor: '#C9BEF2',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
  },
  errorText:  { fontSize: 12, color: '#34208C', flex: 1 },
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
  deviceText:    { flex: 1 },
  deviceName:    { fontSize: 15, fontWeight: '700', color: colors.text },
  deviceUnknown: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  deviceSub:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  confidenceBadge: {
    backgroundColor: '#EDE6FB', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  confidenceBadgeLow: {
    backgroundColor: '#EDE6FB',
  },
  confidenceText: { fontSize: 10, fontWeight: '700', color: '#34208C' },
  confidenceTextLow: { color: '#34208C' },

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
    backgroundColor: '#34208C', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, marginLeft: 10,
  },
  ptaPortalBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Warnings
  warnRow: {
    backgroundColor: '#EDE6FB', padding: 10,
    borderTopWidth: 1, borderTopColor: '#C9BEF2',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  warnText: { fontSize: 12, color: '#34208C' },

  // Recommendation
  recBox: {
    padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  recText: { fontSize: 14, fontWeight: '700' },

  // Override
  overrideBox: {
    backgroundColor: '#EDE6FB', padding: 14,
    borderTopWidth: 1, borderTopColor: '#C9BEF2',
    gap: 12,
  },
  overrideWarningRow: { flexDirection: 'row', gap: 8 },
  overrideWarningIcon: { marginTop: 2 },
  overrideWarning: { flex: 1, fontSize: 13, color: '#34208C', lineHeight: 19 },
  overrideCheckRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#34208C',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#34208C' },
  checkmark:       { color: '#fff', fontSize: 14, fontWeight: '700' },
  overrideCheckLabel: { flex: 1, fontSize: 13, color: '#34208C', lineHeight: 19 },
});
