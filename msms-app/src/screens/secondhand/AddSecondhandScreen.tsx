import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Input } from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import ScannerOverlay from '../../components/ScannerOverlay';
import ImeiVerifyPanel from '../../components/ImeiVerifyPanel';
import VariantPicker from '../../components/VariantPicker';
import { ImeiVerifyResult } from '../../api/imeiVerify';
import { secondhandApi } from '../../api/secondhand';
import { colors } from '../../theme/colors';

const DRAFT_KEY = 'add-secondhand-draft';

type DraftData = {
  mobileName: string;
  brand: string;
  imei: string;
  sellerName: string;
  sellerCnic: string;
  sellerPhone: string;
  purchasePrice: string;
  notes: string;
  sellerPhotoUri?: string;
  cnicPhotoUri?: string;
  storage?: string;
  color?: string;
  ram?: string;
};

export default function AddSecondhandScreen() {
  const navigation = useNavigation<any>();

  const [mobileName, setMobileName] = useState('');
  const [brand, setBrand] = useState('');
  const [imei, setImei] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerCnic, setSellerCnic] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');

  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');
  const [ram, setRam] = useState('');

  const [sellerPhotoUri, setSellerPhotoUri] = useState<string | undefined>();
  const [cnicPhotoUri, setCnicPhotoUri] = useState<string | undefined>();

  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // imeiBlocked = true when IMEI verify panel says reject AND user hasn't confirmed override
  const [imeiBlocked, setImeiBlocked] = useState(false);

  // IMEI scanner
  const [imeiScannerOpen, setImeiScannerOpen] = useState(false);

  // Inline camera state — 'seller' | 'cnic' means camera is open for that field
  const [cameraTarget, setCameraTarget] = useState<'seller' | 'cnic' | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  function getDraftData(extra?: Partial<DraftData>): DraftData {
    return {
      mobileName,
      brand,
      imei,
      sellerName,
      sellerCnic,
      sellerPhone,
      purchasePrice,
      notes,
      sellerPhotoUri,
      cnicPhotoUri,
      storage,
      color,
      ram,
      ...extra,
    };
  }

  async function saveDraft(extra?: Partial<DraftData>) {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(getDraftData(extra)));
  }

  async function loadDraft() {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    const draft: DraftData = JSON.parse(raw);
    setMobileName(draft.mobileName ?? '');
    setBrand(draft.brand ?? '');
    setImei(draft.imei ?? '');
    setSellerName(draft.sellerName ?? '');
    setSellerCnic(draft.sellerCnic ?? '');
    setSellerPhone(draft.sellerPhone ?? '');
    setPurchasePrice(draft.purchasePrice ?? '');
    setNotes(draft.notes ?? '');
    setSellerPhotoUri(draft.sellerPhotoUri);
    setCnicPhotoUri(draft.cnicPhotoUri);
    setStorage(draft.storage ?? '');
    setColor(draft.color ?? '');
    setRam(draft.ram ?? '');
  }

  async function clearDraft() {
    await AsyncStorage.removeItem(DRAFT_KEY);
  }

  useEffect(() => {
    loadDraft().catch((e) =>
      console.warn('Failed to restore secondhand draft:', e?.message)
    );
  }, []);

  function formatCnic(text: string): string {
    const digits = text.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }

  function formatPhone(text: string): string {
    return text.replace(/\D/g, '').slice(0, 11);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!mobileName.trim()) e.mobileName = 'Phone name is required';
    if (!brand.trim()) e.brand = 'Brand is required';
    if (!sellerName.trim()) e.sellerName = 'Seller name is required';
    if (!sellerCnic.trim()) e.sellerCnic = 'Seller CNIC is required';
    else if (sellerCnic.replace(/\D/g, '').length !== 13) e.sellerCnic = 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)';
    if (!sellerPhone.trim()) e.sellerPhone = 'Seller phone is required';
    else if (sellerPhone.length !== 11) e.sellerPhone = 'Phone must be 11 digits';
    if (!purchasePrice) e.purchasePrice = 'Purchase price is required';
    if (isNaN(Number(purchasePrice))) e.purchasePrice = 'Must be a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Opens the inline camera — no external Activity, so Android never kills the app
  async function pickFromCamera(field: 'seller' | 'cnic') {
    if (picking || submitting) return;

    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera permission needed',
          'Please allow camera access from app settings.'
        );
        return;
      }
    }

    setCameraTarget(field);
  }

  async function takePhoto() {
    if (!cameraRef.current || !cameraTarget) return;
    setPicking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      const uri = photo.uri;
      const field = cameraTarget;
      setCameraTarget(null);

      if (field === 'seller') {
        setSellerPhotoUri(uri);
        await saveDraft({ sellerPhotoUri: uri });
      } else {
        setCnicPhotoUri(uri);
        await saveDraft({ cnicPhotoUri: uri });
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message ?? 'Could not take photo');
    } finally {
      setPicking(false);
    }
  }

  async function pickFromLibrary(field: 'seller' | 'cnic') {
    if (picking || submitting) return;

    try {
      setPicking(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo permission needed',
          'Please allow photo library access from app settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;

        if (field === 'seller') {
          setSellerPhotoUri(uri);
          await saveDraft({ sellerPhotoUri: uri });
        } else {
          setCnicPhotoUri(uri);
          await saveDraft({ cnicPhotoUri: uri });
        }
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message ?? 'Could not open gallery');
    } finally {
      setPicking(false);
    }
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (submitting) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('mobileName', mobileName.trim());
      formData.append('brand', brand.trim());
      formData.append('sellerName', sellerName.trim());
      formData.append('sellerCnic', sellerCnic.trim());
      formData.append('sellerPhone', sellerPhone.trim());
      formData.append('purchasePrice', purchasePrice);

      if (imei.trim())    formData.append('imei', imei.trim());
      if (notes.trim())   formData.append('notes', notes.trim());
      if (storage.trim()) formData.append('storage', storage.trim());
      if (color.trim())   formData.append('color', color.trim());
      if (ram.trim())     formData.append('ram', ram.trim());

      if (sellerPhotoUri) {
        const filename = sellerPhotoUri.split('/').pop() ?? 'seller.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
        formData.append('sellerPhoto', {
          uri: sellerPhotoUri,
          name: filename,
          type: ext === 'png' ? 'image/png' : 'image/jpeg',
        } as any);
      }

      if (cnicPhotoUri) {
        const filename = cnicPhotoUri.split('/').pop() ?? 'cnic.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
        formData.append('cnicPhoto', {
          uri: cnicPhotoUri,
          name: filename,
          type: ext === 'png' ? 'image/png' : 'image/jpeg',
        } as any);
      }

      await secondhandApi.create(formData);
      await clearDraft();

      Alert.alert(
        'Saved',
        `${mobileName} added to secondhand inventory.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? 'Something went wrong';
      Alert.alert('Save failed', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={submitting || picking}
        >
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Secondhand Intake</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <SectionHeader title="Phone Details" />

        <Input
          label="Phone Name *"
          placeholder="e.g. Samsung Galaxy S21"
          value={mobileName}
          onChangeText={async (value: string) => {
            setMobileName(value);
            await saveDraft({ mobileName: value });
          }}
          error={errors.mobileName}
          editable={!submitting && !picking}
        />
        <Input
          label="Brand *"
          placeholder="e.g. Samsung, Apple, Oppo"
          value={brand}
          onChangeText={async (value: string) => {
            setBrand(value);
            await saveDraft({ brand: value });
          }}
          error={errors.brand}
          editable={!submitting && !picking}
        />
        <VariantPicker
          label="Storage"
          value={storage}
          onChange={setStorage}
          options={['32GB', '64GB', '128GB', '256GB', '512GB', '1TB']}
          placeholder="Select storage capacity"
          disabled={submitting || picking}
        />
        <VariantPicker
          label="RAM"
          value={ram}
          onChange={setRam}
          options={['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB']}
          placeholder="Select RAM"
          disabled={submitting || picking}
        />
        <VariantPicker
          label="Color"
          value={color}
          onChange={setColor}
          options={['Black', 'White', 'Gold', 'Blue', 'Red', 'Green', 'Purple', 'Silver', 'Rose Gold']}
          placeholder="Select color"
          disabled={submitting || picking}
        />

        {/* ── IMEI scan banner ── */}
        <TouchableOpacity
          style={styles.scanBanner}
          onPress={() => setImeiScannerOpen(true)}
          disabled={submitting || picking}
          activeOpacity={0.8}
        >
          <Text style={styles.scanBannerIcon}>📷</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanBannerTitle}>Scan IMEI barcode on the phone</Text>
            <Text style={styles.scanBannerSub}>Point camera at the IMEI barcode · auto-fills + checks PTA</Text>
          </View>
          <Text style={styles.scanBannerArrow}>›</Text>
        </TouchableOpacity>

        <Input
          label="IMEI (recommended)"
          placeholder="15-digit number on phone · or scan above"
          value={imei}
          onChangeText={async (value: string) => {
            setImei(value);
            await saveDraft({ imei: value });
          }}
          keyboardType="numeric"
          maxLength={15}
          editable={!submitting && !picking}
        />

        {/* Full IMEI verification: device info + PTA DIRBS check */}
        <ImeiVerifyPanel
          imei={imei}
          mode="secondhand"
          onResult={(r: ImeiVerifyResult) => {
            if (r.device.found) {
              if (!mobileName.trim()) setMobileName(`${r.device.brand} ${r.device.model}`.trim());
              if (!brand.trim())      setBrand(r.device.brand);
            }
          }}
          onBlockChange={setImeiBlocked}
        />

        <Input
          label="Purchase Price (Rs) *"
          placeholder="Amount paid to seller"
          value={purchasePrice}
          onChangeText={async (value: string) => {
            setPurchasePrice(value);
            await saveDraft({ purchasePrice: value });
          }}
          keyboardType="numeric"
          error={errors.purchasePrice}
          editable={!submitting && !picking}
        />
        <Input
          label="Notes"
          placeholder="Condition, accessories, faults..."
          value={notes}
          onChangeText={async (value: string) => {
            setNotes(value);
            await saveDraft({ notes: value });
          }}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
          editable={!submitting && !picking}
        />

        <SectionHeader
          title="Seller Information"
          hint="Required for legal compliance. Stored securely."
        />

        <Input
          label="Seller Full Name *"
          placeholder="As on CNIC"
          value={sellerName}
          onChangeText={async (value: string) => {
            setSellerName(value);
            await saveDraft({ sellerName: value });
          }}
          error={errors.sellerName}
          editable={!submitting && !picking}
        />
        <Input
          label="Seller CNIC *"
          placeholder="35202-1234567-1"
          value={sellerCnic}
          onChangeText={async (value: string) => {
            const formatted = formatCnic(value);
            setSellerCnic(formatted);
            await saveDraft({ sellerCnic: formatted });
          }}
          keyboardType="numeric"
          maxLength={15}
          error={errors.sellerCnic}
          editable={!submitting && !picking}
        />
        <Input
          label="Seller Phone *"
          placeholder="03001234567"
          value={sellerPhone}
          onChangeText={async (value: string) => {
            const formatted = formatPhone(value);
            setSellerPhone(formatted);
            await saveDraft({ sellerPhone: formatted });
          }}
          keyboardType="phone-pad"
          maxLength={11}
          error={errors.sellerPhone}
          editable={!submitting && !picking}
        />

        <SectionHeader title="Photos" />

        <InlinePhotoPicker
          label="Seller Photo"
          uri={sellerPhotoUri}
          onCamera={() => pickFromCamera('seller')}
          onLibrary={() => pickFromLibrary('seller')}
          onClear={async () => {
            setSellerPhotoUri(undefined);
            await saveDraft({ sellerPhotoUri: undefined });
          }}
          disabled={picking || submitting}
        />

        <InlinePhotoPicker
          label="CNIC Photo"
          uri={cnicPhotoUri}
          onCamera={() => pickFromCamera('cnic')}
          onLibrary={() => pickFromLibrary('cnic')}
          onClear={async () => {
            setCnicPhotoUri(undefined);
            await saveDraft({ cnicPhotoUri: undefined });
          }}
          disabled={picking || submitting}
        />

        {imeiBlocked && (
          <View style={styles.blockedBanner}>
            <Text style={styles.blockedText}>
              🚫 Cannot save — device is flagged blocked/stolen.{'\n'}
              Check the verification panel above and confirm override to proceed.
            </Text>
          </View>
        )}

        <Button
          label="Save Secondhand Record"
          onPress={handleSubmit}
          loading={submitting}
          disabled={picking || imeiBlocked}
          style={{ marginTop: 12, opacity: imeiBlocked ? 0.4 : 1 }}
        />

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* IMEI scanner overlay */}
      <ScannerOverlay
        visible={imeiScannerOpen}
        onScanned={async (code) => {
          setImeiScannerOpen(false);
          const isImei = /^\d{15}$/.test(code);
          if (isImei) {
            setImei(code);
            await saveDraft({ imei: code });
          } else {
            Alert.alert(
              'Not an IMEI',
              `Scanned: ${code}\n\nThat looks like a product barcode, not an IMEI. Point the camera at the long 15-digit number barcode on the phone or box.`,
            );
          }
        }}
        onClose={() => setImeiScannerOpen(false)}
        title="Scan IMEI Barcode"
        hint="Point at the barcode above the 15-digit IMEI number"
      />

      {/* Inline camera overlay — stays inside the app so Android never kills the process */}
      {cameraTarget !== null && (
        <View style={cameraStyles.overlay}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={cameraFacing}
          />

          {/* Top bar */}
          <View style={cameraStyles.topBar}>
            <TouchableOpacity
              style={cameraStyles.topBtn}
              onPress={() => setCameraTarget(null)}
            >
              <Text style={cameraStyles.topBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={cameraStyles.topLabel}>
              {cameraTarget === 'seller' ? 'Seller Photo' : 'CNIC Photo'}
            </Text>
            <TouchableOpacity
              style={cameraStyles.topBtn}
              onPress={() =>
                setCameraFacing((f) => (f === 'back' ? 'front' : 'back'))
              }
            >
              <Text style={cameraStyles.topBtnText}>Flip</Text>
            </TouchableOpacity>
          </View>

          {/* Shutter button */}
          <View style={cameraStyles.bottomBar}>
            {picking ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <TouchableOpacity
                style={cameraStyles.shutterOuter}
                onPress={takePhoto}
                activeOpacity={0.8}
              >
                <View style={cameraStyles.shutterInner} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={secStyles.wrapper}>
      <Text style={secStyles.title}>{title}</Text>
      {hint && <Text style={secStyles.hint}>{hint}</Text>}
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { marginTop: 8, marginBottom: 10 },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
});

interface InlinePhotoPickerProps {
  label: string;
  uri?: string;
  onCamera: () => void;
  onLibrary: () => void;
  onClear: () => void;
  disabled?: boolean;
}

function InlinePhotoPicker({
  label,
  uri,
  onCamera,
  onLibrary,
  onClear,
  disabled,
}: InlinePhotoPickerProps) {
  return (
    <View style={photoStyles.wrapper}>
      <Text style={photoStyles.label}>{label}</Text>

      {uri ? (
        <View style={photoStyles.previewBox}>
          <Image source={{ uri }} style={photoStyles.previewImg} resizeMode="cover" />
          <View style={photoStyles.previewActions}>
            <TouchableOpacity
              style={photoStyles.actionBtn}
              onPress={onCamera}
              disabled={disabled}
            >
              <Text style={photoStyles.actionBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={photoStyles.actionBtn}
              onPress={onLibrary}
              disabled={disabled}
            >
              <Text style={photoStyles.actionBtnText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[photoStyles.actionBtn, photoStyles.clearBtn]}
              onPress={onClear}
              disabled={disabled}
            >
              <Text style={photoStyles.clearBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={photoStyles.emptyBox}>
          <TouchableOpacity
            style={[photoStyles.sourceBtn, disabled && photoStyles.disabledBtn]}
            onPress={onCamera}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={photoStyles.sourceBtnText}>Camera</Text>
          </TouchableOpacity>

          <View style={photoStyles.sourceDivider} />

          <TouchableOpacity
            style={[photoStyles.sourceBtn, disabled && photoStyles.disabledBtn]}
            onPress={onLibrary}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={photoStyles.sourceBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const photoStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6 },
  emptyBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  sourceBtn: {
    flex: 1,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: { opacity: 0.4 },
  sourceBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  sourceDivider: { width: 1, backgroundColor: colors.border },
  previewBox: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImg: { width: '100%', height: 160 },
  previewActions: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 8,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  actionBtnText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  clearBtn: { borderColor: colors.danger },
  clearBtnText: { fontSize: 12, color: colors.danger, fontWeight: '500' },
});

const cameraStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  topBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  topLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  blockedBanner: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: '#fecaca',
  },
  blockedText: { fontSize: 13, color: '#991b1b', lineHeight: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  form: { padding: 16 },

  // IMEI scan banner
  scanBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  scanBannerIcon:  { fontSize: 24 },
  scanBannerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scanBannerSub:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  scanBannerArrow: { color: '#fff', fontSize: 22, fontWeight: '300' },
});
