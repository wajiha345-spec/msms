/**
 * ScannerOverlay — reusable barcode/QR camera scanner with manual IMEI entry.
 *
 * IMPORTANT — what the camera can and cannot read:
 *   ✓ Barcodes   — EAN-13, EAN-8, Code-128, Code-39, UPC-A/E, ITF-14, PDF-417, QR
 *   ✗ Plain text — printed IMEI numbers cannot be read by the camera (no OCR).
 *                  Users must type IMEIs via the "⌨️ Type" manual-entry mode.
 *
 * Works in two modes:
 *  1. Camera scan  — CameraView.onBarcodeScanned (barcodes + QR only)
 *  2. Manual entry — TextInput (IMEI, barcode, or USB/Bluetooth HID scanner)
 *
 * Props:
 *   visible   — show/hide the overlay
 *   onScanned — called with the raw code string once a valid scan arrives
 *   onClose   — called when user dismisses
 *   title     — header label
 *   hint      — sub-label shown inside the scan frame
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, Vibration, Linking,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { colors } from '../theme/colors';

interface Props {
  visible:   boolean;
  onScanned: (code: string) => void;
  onClose:   () => void;
  title?:    string;
  hint?:     string;
}

export default function ScannerOverlay({
  visible, onScanned, onClose,
  title = 'Scan Barcode',
  hint  = 'Point camera at barcode or QR code',
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode]     = useState(false);
  const [manualCode, setManualCode]     = useState('');
  const [scanning,   setScanning]       = useState(true);  // debounce flag
  const [feedback,   setFeedback]       = useState<string | null>(null);
  const manualRef = useRef<TextInput>(null);

  // Request permission when overlay becomes visible
  useEffect(() => {
    if (visible && !permission?.granted && permission?.canAskAgain !== false) {
      requestPermission();
    }
    if (visible) {
      setManualMode(false);
      setManualCode('');
      setFeedback(null);
      setScanning(true);
    }
  }, [visible]);

  // Auto-focus manual input when switching to manual mode
  useEffect(() => {
    if (manualMode) {
      setTimeout(() => manualRef.current?.focus(), 100);
    }
  }, [manualMode]);

  const handleScanned = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed || !scanning) return;

    setScanning(false);          // debounce — ignore further scans
    Vibration.vibrate(80);       // haptic feedback
    setFeedback(`✓ ${trimmed}`);

    setTimeout(() => {
      onScanned(trimmed);
      setFeedback(null);
      setScanning(true);
    }, 600);
  }, [scanning, onScanned]);

  const onBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    handleScanned(result.data);
  }, [handleScanned]);

  function submitManual() {
    const code = manualCode.trim();
    if (!code) return;
    handleScanned(code);
    setManualCode('');
  }

  if (!visible) return null;

  // ── Determine permission state ─────────────────────────────────────────────
  // canAskAgain === false means the user permanently denied (Android "Don't ask again")
  const permDeniedPermanently = permission !== null &&
    !permission?.granted &&
    permission?.canAskAgain === false;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={() => setManualMode(m => !m)}
            style={styles.modeBtn}
          >
            <Text style={styles.modeTxt}>
              {manualMode ? '📷 Camera' : '⌨️ Type'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Camera or manual ── */}
        {!manualMode ? (
          <View style={styles.cameraBox}>
            {!permission?.granted ? (
              /* ── Permission denied / not yet granted ── */
              <View style={styles.permBox}>
                <Text style={styles.permIcon}>
                  {permDeniedPermanently ? '🚫' : '📷'}
                </Text>
                <Text style={styles.permTitle}>
                  {permDeniedPermanently
                    ? 'Camera access blocked'
                    : 'Camera access needed'}
                </Text>
                <Text style={styles.permText}>
                  {permDeniedPermanently
                    ? 'You permanently denied camera permission. Open Settings to allow it, or type the barcode/IMEI manually below.'
                    : 'Allow camera access to scan barcodes and QR codes.'}
                </Text>

                {permDeniedPermanently ? (
                  <TouchableOpacity
                    style={styles.permBtn}
                    onPress={() => Linking.openSettings()}
                  >
                    <Text style={styles.permBtnTxt}>Open Settings</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.permBtn}
                    onPress={requestPermission}
                  >
                    <Text style={styles.permBtnTxt}>Allow Camera</Text>
                  </TouchableOpacity>
                )}

                {/* Always show the manual escape hatch */}
                <TouchableOpacity
                  style={styles.permManualBtn}
                  onPress={() => setManualMode(true)}
                >
                  <Text style={styles.permManualTxt}>⌨️ Type IMEI or barcode instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
                      'code39', 'code128', 'pdf417', 'itf14',
                    ],
                  }}
                />

                {/* Scan frame overlay */}
                <View style={styles.scanFrame}>
                  <View style={styles.frameTL} />
                  <View style={styles.frameTR} />
                  <View style={styles.frameBL} />
                  <View style={styles.frameBR} />
                </View>

                {/* Primary hint */}
                <Text style={styles.hint}>{hint}</Text>

                {/* Secondary note — honest about camera limitation */}
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>
                    📷 Camera reads barcodes only — tap <Text style={styles.noteHighlight}>⌨️ Type</Text> above to enter IMEI
                  </Text>
                </View>

                {/* Feedback flash */}
                {feedback && (
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackTxt}>{feedback}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          /* ── Manual / USB barcode scanner input ── */
          <View style={styles.manualBox}>
            <Text style={styles.manualLabel}>
              Type IMEI or barcode
            </Text>
            <Text style={styles.manualHint}>
              • IMEI: type the 15-digit number printed on the phone{'\n'}
              • Barcode: type or let a USB/Bluetooth scanner type it for you
            </Text>
            <TextInput
              ref={manualRef}
              style={styles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="15-digit IMEI or barcode..."
              placeholderTextColor={colors.textMuted}
              keyboardType="default"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={submitManual}
            />
            <TouchableOpacity
              style={[styles.submitBtn, !manualCode.trim() && styles.submitBtnDisabled]}
              onPress={submitManual}
              disabled={!manualCode.trim()}
            >
              <Text style={styles.submitBtnTxt}>Look Up →</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </Modal>
  );
}

const CORNER = 24;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingTop:       54,
    paddingHorizontal: 16,
    paddingBottom:    14,
    backgroundColor:  'rgba(0,0,0,0.6)',
  },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 80 },
  closeTxt: { color: '#fff', fontSize: 15, fontWeight: '500' },
  title:    { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', flex: 1 },
  modeBtn:  { minWidth: 80, alignItems: 'flex-end' },
  modeTxt:  { color: '#facc15', fontSize: 13, fontWeight: '600' },

  /* Camera */
  cameraBox: { flex: 1, position: 'relative' },

  /* Permission states */
  permBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 14, paddingHorizontal: 32, backgroundColor: '#111',
  },
  permIcon:  { fontSize: 48 },
  permTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  permText:  { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 10, marginTop: 4,
  },
  permBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  permManualBtn: {
    marginTop: 8,
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  permManualTxt: { color: '#facc15', fontSize: 14, fontWeight: '600' },

  /* Scan frame corners */
  scanFrame: {
    position: 'absolute',
    top:      '25%',
    left:     '15%',
    right:    '15%',
    bottom:   '25%',
  },
  frameTL: { position: 'absolute', top: 0,    left: 0,   width: CORNER, height: CORNER, borderTopWidth: BORDER,    borderLeftWidth: BORDER,  borderColor: '#fff' },
  frameTR: { position: 'absolute', top: 0,    right: 0,  width: CORNER, height: CORNER, borderTopWidth: BORDER,    borderRightWidth: BORDER, borderColor: '#fff' },
  frameBL: { position: 'absolute', bottom: 0, left: 0,   width: CORNER, height: CORNER, borderBottomWidth: BORDER, borderLeftWidth: BORDER,  borderColor: '#fff' },
  frameBR: { position: 'absolute', bottom: 0, right: 0,  width: CORNER, height: CORNER, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderColor: '#fff' },

  hint: {
    position:  'absolute',
    bottom:    110,
    left: 0, right: 0,
    textAlign: 'center',
    color:     'rgba(255,255,255,0.9)',
    fontSize:  13,
    fontWeight: '500',
  },
  noteBox: {
    position: 'absolute',
    bottom:   56,
    left: 24, right: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  noteText:      { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  noteHighlight: { color: '#facc15', fontWeight: '700' },

  feedbackBox: {
    position:          'absolute',
    top:               '50%',
    alignSelf:         'center',
    backgroundColor:   'rgba(34,197,94,0.9)',
    paddingHorizontal: 24,
    paddingVertical:   10,
    borderRadius:      12,
  },
  feedbackTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* Manual */
  manualBox: {
    flex:    1,
    padding: 24,
    paddingTop: 40,
    backgroundColor: colors.background,
  },
  manualLabel: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  manualHint:  { fontSize: 13, color: colors.textMuted, marginBottom: 28, lineHeight: 22 },
  manualInput: {
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    12,
    padding:         16,
    fontSize:        18,
    fontFamily:      'monospace',
    color:           colors.text,
    backgroundColor: colors.card,
    letterSpacing:   1,
    marginBottom:    16,
  },
  submitBtn:         { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnTxt:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
