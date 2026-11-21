import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { animateLayout, haptic } from '../components/motion';
import { Chip, PillButton } from '../components/ui';
import { tr } from '../i18n/tr';
import { computePalateTypeId } from '../lib/palate';
import { classifyPlace, normalizePlace, scoreCup } from '../lib/scoring';
import { refreshReminder } from '../lib/reminders';
import { knownPlaces, loadEntries, newId, persistPhoto, saveEntry, updateMetrics } from '../lib/storage';
import { brewRatio, earnedBadges } from '../lib/progress';
import type { CupEntry, CupInput, Grind, Method, TasteNote, VenueKind } from '../lib/types';
import { colors } from '../theme';

/** Klavyenin üstündeki "Bitti" çubuğu (sayı klavyesinde ve notta Return tuşu yok). */
const KB_DONE = 'cupped-kb-done';

const METHODS: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];
const NOTES: TasteNote[] = ['fruity', 'floral', 'chocolate', 'nutty', 'caramel', 'bright', 'bold'];
const GRINDS: Grind[] = ['fine', 'medium', 'coarse'];

/** "15,5" ya da "15.5" → 15.5; boş/geçersiz → null */
function parseNum(t: string): number | null {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

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
  const savingRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash] = useState(() => new Animated.Value(0));
  // Detay modu
  const [showDetail, setShowDetail] = useState(false);
  const [notes, setNotes] = useState<TasteNote[]>([]);
  const [origin, setOrigin] = useState('');
  const [dose, setDose] = useState('');
  const [water, setWater] = useState('');
  const [grind, setGrind] = useState<Grind | null>(null);
  const [note, setNote] = useState('');

  function toggleNote(n: TasteNote) {
    setNotes((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : cur.length >= 2 ? [cur[1], n] : [...cur, n]));
  }

  // H3: ekranın açılışından kayda kadar geçen süre
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
    loadEntries().then(setHistory);
    updateMetrics((m) => {
      m.newOpened += 1;
    }).catch(() => {});
  }, []);

  const places = knownPlaces(history).slice(0, 6);

  async function takePhoto() {
    if (!cameraReady || capturing) return;
    setCapturing(true);
    // Deklanşör flaşı (iOS kamerasındaki gibi kısa beyaz parlama)
    flash.setValue(0.85);
    Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    haptic.light();
    try {
      const pic = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      if (pic?.uri) {
        setPhoto(pic.uri);
        setStep('details');
      }
    } catch {
      Alert.alert(tr.capture.cameraError);
    } finally {
      setCapturing(false);
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
    if (!method || !where || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      // Geçmişi kaydetme anında taze oku: ekran açılır açılmaz kaydedilirse yanlış "keşif" puanı verilmesin.
      const history = await loadEntries();
      const id = newId();
      const venueKind: VenueKind = where.kind === 'place' ? classifyPlace(where.name) : where.kind;
      const placeName = where.kind === 'place' ? where.name : null;
      const input: CupInput = { method, placeName, venueKind, notes, origin: origin.trim() || null };
      const doseG = parseNum(dose);
      const waterMl = parseNum(water);
      const brew = doseG || waterMl || grind ? { doseG, waterMl, grind } : null;
      const noteText = note.trim() || null;
      const createdAt = new Date().toISOString();
      const { total, parts } = scoreCup(input, history, createdAt);
      const palateTypeId = computePalateTypeId([...history, { ...input, createdAt }]);
      let photoUri: string | null = null;
      if (photo) {
        try {
          photoUri = await persistPhoto(photo, id);
        } catch {
          photoUri = null; // geçici dosya iOS tarafından silinir; adresini saklamak boş fotoğraf demek
        }
      }
      const captureMs = Date.now() - openedAt.current;
      const newEntry: CupEntry = { id, createdAt, photoUri, ...input, brew, note: noteText, captureMs, score: total, parts, palateTypeId };
      await saveEntry(newEntry);
      // Bu fincanla yeni kazanılan rozetler (sonuç ekranında kutlanır)
      const before = new Set(earnedBadges(history).map((b) => b.id));
      const newBadges = earnedBadges([...history, newEntry])
        .filter((b) => !before.has(b.id))
        .map((b) => b.id)
        .join(',');
      updateMetrics((m) => {
        m.newSaved += 1;
      }).catch(() => {});
      refreshReminder();
      haptic.success();
      router.replace({ pathname: '/cup/[id]', params: { id, fresh: '1', ...(newBadges ? { badges: newBadges } : {}) } });
    } catch {
      Alert.alert(tr.capture.saveError);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // --- 1. adım: fotoğraf ---
  if (step === 'photo') {
    return (
      <View style={styles.cameraScreen}>
        <StatusBar style="light" />
        {permission == null ? null : permission.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} />
        ) : (
          <View style={[styles.permission, { paddingTop: insets.top + 60 }]}>
            <Text style={styles.permTitle}>{tr.capture.permissionTitle}</Text>
            <Text style={styles.permBody}>
              {permission.canAskAgain ? tr.capture.permissionBody : tr.capture.permissionDenied}
            </Text>
            {permission.canAskAgain ? (
              <PillButton label={tr.capture.allow} onPress={requestPermission} style={{ marginTop: 24, alignSelf: 'stretch' }} variant="light" />
            ) : (
              <PillButton label={tr.capture.openSettings} onPress={() => Linking.openSettings()} style={{ marginTop: 24, alignSelf: 'stretch' }} variant="light" />
            )}
          </View>
        )}
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
        {capturing ? (
          <View style={styles.capturing} pointerEvents="none">
            <ActivityIndicator color="#fff" size="large" />
          </View>
        ) : null}

        <Pressable onPress={() => router.back()} style={[styles.close, { top: insets.top + 8 }]} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <View style={[styles.cameraBar, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable onPress={pickFromGallery} style={styles.sideBtn}>
            <Text style={styles.sideText}>{tr.capture.fromGallery}</Text>
          </Pressable>
          <Pressable
            onPress={takePhoto}
            disabled={!permission?.granted || !cameraReady || capturing}
            style={({ pressed }) => [
              styles.shutter,
              (!permission?.granted || !cameraReady || capturing) && { opacity: 0.3 },
              pressed && { transform: [{ scale: 0.92 }] },
            ]}
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
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
          <Chip label={tr.capture.home} selected={where?.kind === 'home'} onPress={() => {
              setTyped('');
              setWhere({ kind: 'home' });
            }} />
          <Chip label={tr.capture.office} selected={where?.kind === 'office'} onPress={() => {
              setTyped('');
              setWhere({ kind: 'office' });
            }} />
          {places.map((p) => (
            <Chip
              key={p}
              label={p}
              selected={where?.kind === 'place' && normalizePlace(where.name) === normalizePlace(p)}
              onPress={() => {
                setTyped('');
                setWhere({ kind: 'place', name: p });
              }}
            />
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
              inputAccessoryViewID={KB_DONE}
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

        <Pressable
          onPress={() => {
            animateLayout();
            setShowDetail((v) => !v);
          }}
          hitSlop={8}
          style={styles.detailToggle}
        >
          <Text style={styles.detailToggleText}>{showDetail ? tr.capture.hideDetail : tr.capture.addDetail}</Text>
        </Pressable>

        {showDetail ? (
          <View>
            <Text style={styles.detailHint}>{tr.capture.detailHint}</Text>

            <Text style={styles.label}>{tr.capture.notesLabel}</Text>
            <View style={styles.chips}>
              {NOTES.map((n) => (
                <Chip key={n} label={tr.notes[n]} selected={notes.includes(n)} onPress={() => toggleNote(n)} />
              ))}
            </View>

            <Text style={styles.label}>{tr.capture.originLabel}</Text>
            <TextInput
              inputAccessoryViewID={KB_DONE}
              value={origin}
              onChangeText={setOrigin}
              placeholder={tr.capture.originPlaceholder}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />

            <Text style={styles.label}>
              {tr.capture.recipeLabel}
              {brewRatio(parseNum(dose), parseNum(water)) ? `  ·  ${tr.capture.ratio(brewRatio(parseNum(dose), parseNum(water))!)}` : ''}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[styles.unit, { flex: 1, marginRight: 8 }]}>{tr.capture.doseLabel}</Text>
              <Text style={[styles.unit, { flex: 1 }]}>{tr.capture.waterLabel}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TextInput
              inputAccessoryViewID={KB_DONE}
                value={dose}
                onChangeText={setDose}
                placeholder={tr.capture.doseLabel}
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1, flexBasis: 0, minWidth: 0, marginRight: 8 }]}
              />
              <TextInput
              inputAccessoryViewID={KB_DONE}
                value={water}
                onChangeText={setWater}
                placeholder={tr.capture.waterLabel}
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1, flexBasis: 0, minWidth: 0 }]}
              />
            </View>

            <Text style={styles.label}>{tr.capture.grindLabel}</Text>
            <View style={styles.chips}>
              {GRINDS.map((g) => (
                <Chip key={g} label={tr.capture.grind[g]} selected={grind === g} onPress={() => setGrind(grind === g ? null : g)} />
              ))}
            </View>

            <Text style={styles.label}>{tr.capture.noteLabel}</Text>
            <TextInput
              inputAccessoryViewID={KB_DONE}
              value={note}
              onChangeText={setNote}
              placeholder={tr.capture.notePlaceholder}
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
        <PillButton
          label={!method ? tr.capture.chooseMethod : !where ? tr.capture.choosePlace : tr.capture.save}
          onPress={save}
          disabled={!method || !where || saving}
        />
      </View>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={KB_DONE}>
          <View style={styles.kbBar}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10}>
              <Text style={styles.kbDone}>{tr.capture.keyboardDone}</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' },
  capturing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
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
  detailToggle: { marginTop: 24, alignSelf: 'flex-start' },
  detailToggleText: { fontSize: 16, fontWeight: '800', color: colors.accent },
  detailHint: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 8 },
  label: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 10 },
  unit: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
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
  saveBar: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  kbBar: { flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: '#F1EEE9', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  kbDone: { fontSize: 16, fontWeight: '800', color: colors.accent },
});
