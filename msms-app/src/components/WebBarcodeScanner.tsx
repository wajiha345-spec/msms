import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import { colors } from '../theme/colors';

// Desktop-only camera barcode scanner (Platform.OS === 'web'). expo-camera's
// web implementation only decodes QR codes, not the EAN/UPC/Code128/etc.
// formats real products use — ScannerOverlay skips it entirely on desktop
// and defaults to manual entry instead. This component fills that gap with
// @zxing/browser, a pure-JS decoder that works via getUserMedia + canvas
// frame sampling, independent of any native camera SDK or the browser's
// (unreliable — confirmed absent in the Electron build tested) native
// BarcodeDetector API. Same formats as the native scanner's config in
// ScannerOverlay, minus QR (native still uses expo-camera for QR itself);
// listed together here for one detector shared across all of them.
const HINTS = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODABAR,
  BarcodeFormat.PDF_417,
  BarcodeFormat.ITF,
]);
// Optimize for accuracy over speed — IMEI/serial barcodes on device boxes
// are dense (15 digits) and a missed/garbled read is worse than a slightly
// slower one on a desktop where the phone can be held steady.
HINTS.set(DecodeHintType.TRY_HARDER, true);

// decodeFromVideoDevice() (used previously) requests getUserMedia with no
// resolution constraints at all, so browsers commonly default to 640x480 —
// nowhere near enough detail to resolve the fine bars of a 15-digit Code128
// IMEI barcode. Request a high-resolution stream explicitly instead; all
// values are "ideal", so cameras that can't hit 1080p just use their best.
const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
};

// react-native's JSX typings don't include raw DOM tags — this project has
// no other web-only camera UI needing one, so a plain `any`-typed intrinsic
// is the simplest way to render a real <video> element. Only ever mounted
// when Platform.OS === 'web', so it never reaches native's renderer.
const Video: any = 'video';

interface Props {
  onScanned: (code: string) => void;
  scanning: boolean; // debounce flag from the parent, mirrors native's `scanning` prop
}

export default function WebBarcodeScanner({ onScanned, scanning }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [status, setStatus] = useState<'starting' | 'active' | 'denied' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [captureHint, setCaptureHint] = useState('');

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader(HINTS as any);
    readerRef.current = reader;

    reader
      .decodeFromConstraints(VIDEO_CONSTRAINTS, videoRef.current!, (result, err) => {
        if (cancelled) return;
        if (result) {
          onScanned(result.getText());
        } else if (err && !(err instanceof NotFoundException)) {
          // NotFoundException fires continuously while no barcode is in
          // frame — that's the normal "still looking" state, not an error.
        }
      })
      .then((controls) => {
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
        setStatus('active');
      })
      .catch((e: any) => {
        if (cancelled) return;
        if (e?.name === 'NotAllowedError') {
          setStatus('denied');
        } else {
          setStatus('error');
          setErrorMessage(e?.message || 'Could not start the camera');
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      readerRef.current = null;
    };
  }, []);

  // Dense barcodes (a 15-digit Code128 IMEI has far finer bars than a typical
  // EAN product barcode) routinely beat the continuous live-video decode
  // loop above — laptop webcams cap the video stream at a modest resolution
  // and motion blur during the 500ms poll doesn't help either. This grabs
  // one still frame via the Image Capture API's takePhoto() (full sensor
  // resolution on hardware/drivers that support it, well above the video
  // stream's resolution) and decodes just that frame with the same
  // hints/formats — the same trick a phone's "flash to focus and capture"
  // barcode apps use for dense codes. Falls back to a canvas grab of the
  // current video frame (same resolution as live decode, but at least
  // motion-blur-free at the instant of the tap) if takePhoto isn't
  // available, since decode failure there is expected on some webcams.
  async function handleCapture() {
    const video = videoRef.current;
    const reader = readerRef.current;
    if (!video || !reader || capturing) return;
    setCapturing(true);
    setCaptureHint('');
    let objectUrl: string | null = null;
    try {
      const stream = video.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks?.()[0];
      let blob: Blob | null = null;
      const ImageCaptureCtor = (window as any).ImageCapture;
      if (track && ImageCaptureCtor) {
        try {
          const imageCapture = new ImageCaptureCtor(track);
          blob = await imageCapture.takePhoto();
        } catch {
          blob = null;
        }
      }

      let result;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        result = await reader.decodeFromImageUrl(objectUrl);
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
        result = await reader.decodeFromImageUrl(canvas.toDataURL('image/png'));
      }
      onScanned(result.getText());
    } catch {
      setCaptureHint('No code found in that photo — hold it steady, fill the frame, and try again.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setCapturing(false);
    }
  }

  if (status === 'denied') {
    return (
      <View style={styles.center}>
        <Ionicons name="ban-outline" size={32} color={colors.textMuted} style={styles.icon} />
        <Text style={styles.title}>Camera access blocked</Text>
        <Text style={styles.text}>
          Allow camera access for this app in Windows Settings, or use the Type option above.
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={32} color={colors.textMuted} style={styles.icon} />
        <Text style={styles.title}>Camera unavailable</Text>
        <Text style={styles.text}>{errorMessage}</Text>
        <Text style={styles.text}>Use the Type option above instead.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        style={styles.video}
        muted
        playsInline
      />
      {status === 'starting' && (
        <View style={styles.starting}>
          <Text style={styles.text}>Starting camera…</Text>
        </View>
      )}
      {status === 'active' && (
        <View style={styles.captureRow}>
          {!!captureHint && (
            <View style={styles.captureHintBox}>
              <Text style={styles.captureHintText}>{captureHint}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={handleCapture}
            disabled={capturing}
            style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
          >
            <Text style={styles.captureBtnText}>
              {capturing ? 'Reading…' : 'IMEI not scanning? Tap to capture'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { width: '100%', height: '100%', objectFit: 'cover' } as any,
  starting: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 10, paddingHorizontal: 32, backgroundColor: '#111',
  },
  icon: { marginBottom: 4 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  text: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  captureRow: {
    position: 'absolute', left: 0, right: 0, bottom: 16,
    alignItems: 'center', gap: 8, paddingHorizontal: 20,
  },
  captureHintBox: {
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: 340,
  },
  captureHintText: { color: '#fff', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  captureBtn: {
    backgroundColor: colors.primary, borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
