import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, PillButton } from '../components/ui';
import { tr } from '../i18n/tr';
import { computePalateTypeId } from '../lib/palate';
import { classifyPlace, normalizePlace, scoreCup } from '../lib/scoring';
import { knownPlaces, loadEntries, newId, persistPhoto, saveEntry } from '../lib/storage';
import type { CupEntry, CupInput, Method, VenueKind } from '../lib/types';
import { colors } from '../theme';

const METHODS: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];

type Where = { kind: 'home' } | { kind: 'office' } | { kind: 'place'; name: string };

export default function NewCup() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [step, setStep] = useState<'photo' | 'details'>('photo');
  const [method, setMethod] = useState<Method | null>(null);
  const [where, setWhere] = useState<Where | null>(null);
  const [typed, setTyped] = useState('');
  const [history, setHistory] = useState<CupEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEntries().then(setHistory);
  }, []);

  const places = knownPlaces(history).slice(0, 6);

  async function takePhoto() {
    try {
      const pic = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      if (pic?.uri) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setPhoto(pic.uri);
        setStep('details');
      }
    } catch {
      // Kamera hata verirse kullanıcı galeriden seçebilir.
    }
  }

  async function pickFromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled && res.assets[0]?.uri) {
      setPhoto(res.assets[0].uri);
      setStep('details');
    }
  }

  function selectTyped() {
    const name = typed.trim();
    if (name) setWhere({ kind: 'place', name });
  }

  async function save() {
    if (!method || !where || saving) return;
    setSaving(true);
    try {
      const id = newId();
      const venueKind: VenueKind = where.kind === 'place' ? classifyPlace(where.name) : where.kind;
      const placeName = where.kind === 'place' ? where.name : null;
      const input: CupInput = { method, placeName, venueKind, notes: [], origin: null };
      const { total, parts } = scoreCup(input, history);
      const createdAt = new Date().toISOString();
      const palateTypeId = computePalateTypeId([...history, { ...input, createdAt }]);
      let photoUri: string | null = null;
      if (photo) {
        try {
          photoUri = await persistPhoto(photo, id);
        } catch {
          photoUri = photo; // kopyalanamazsa geçici adresi kullan
        }
      }
      await saveEntry({ id, createdAt, photoUri, ...input, score: total, parts, palateTypeId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace({ pathname: '/cup/[id]', params: { id, fresh: '1' } });
    } finally {
      setSaving(false);
    }
  }

  // --- 1. adım: fotoğraf ---
  if (step === 'photo') {
    return (
      <View style={styles.cameraScreen}>
        {permission?.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <View style={[styles.permission, { paddingTop: insets.top + 60 }]}>
            <Text style={styles.permTitle}>{tr.capture.permissionTitle}</Text>
            <Text style={styles.permBody}>{tr.capture.permissionBody}</Text>
            {permission?.canAskAgain !== false ? (
              <PillButton label={tr.capture.allow} onPress={requestPermission} style={{ marginTop: 24, alignSelf: 'stretch' }} variant="light" />
            ) : null}
          </View>
        )}

        <Pressable onPress={() => router.back()} style={[styles.close, { top: insets.top + 8 }]} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <View style={[styles.cameraBar, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable onPress={pickFromGallery} style={styles.sideBtn}>
            <Text style={styles.sideText}>{tr.capture.fromGallery}</Text>
          </Pressable>
          <Pressable
            onPress={takePhoto}
            disabled={!permission?.granted}
            style={({ pressed }) => [styles.shutter, !permission?.granted && { opacity: 0.3 }, pressed && { transform: [{ scale: 0.92 }] }]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable onPress={() => setStep('details')} style={styles.sideBtn}>
            <Text style={styles.sideText}>{tr.capture.skipPhoto}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- 2. adım: Nasıl? + Nerede? ---
  const typedKey = normalizePlace(typed);
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => setStep('photo')} hitSlop={12}>
            {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : <View style={[styles.preview, styles.previewEmpty]}><Text style={{ fontSize: 28 }}>☕</Text></View>}
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.q}>{tr.capture.how}</Text>
        <View style={styles.chips}>
          {METHODS.map((m) => (
            <Chip key={m} label={tr.methods[m]} selected={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>

        <Text style={styles.q}>{tr.capture.where}</Text>
        <View style={styles.chips}>
          <Chip label={tr.capture.home} selected={where?.kind === 'home'} onPress={() => setWhere({ kind: 'home' })} />
          <Chip label={tr.capture.office} selected={where?.kind === 'office'} onPress={() => setWhere({ kind: 'office' })} />
          {places.map((p) => (
            <Chip
              key={p}
              label={p}
              selected={where?.kind === 'place' && normalizePlace(where.name) === normalizePlace(p)}
              onPress={() => setWhere({ kind: 'place', name: p })}
            />
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            value={typed}
            onChangeText={(t) => {
              setTyped(t);
              if (t.trim()) setWhere({ kind: 'place', name: t.trim() });
              else if (where?.kind === 'place' && normalizePlace(where.name) === typedKey) setWhere(null);
            }}
            onSubmitEditing={selectTyped}
            placeholder={tr.capture.placePlaceholder}
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
          />
        </View>
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
        <PillButton
          label={!method ? tr.capture.chooseMethod : !where ? tr.capture.choosePlace : tr.capture.save}
          onPress={save}
          disabled={!method || !where || saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  permission: { flex: 1, paddingHorizontal: 28 },
  permTitle: { color: colors.white, fontSize: 26, fontWeight: '800' },
  permBody: { color: '#CFCAC3', fontSize: 16, marginTop: 10, lineHeight: 22 },
  close: { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.white, fontSize: 20, fontWeight: '600' },
  cameraBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sideBtn: { width: 96, alignItems: 'center' },
  sideText: { color: colors.white, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  preview: { width: 88, height: 88, borderRadius: 18 },
  previewEmpty: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  q: { fontSize: 26, fontWeight: '900', color: colors.text, marginTop: 24, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  inputRow: { marginTop: 4 },
  input: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.bg },
});
