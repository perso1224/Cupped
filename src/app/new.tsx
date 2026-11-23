import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  BackHandler,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { CloseButton, goBack } from '../components/NavButtons';
import { OriginPicker } from '../components/OriginPicker';
import { StarInput } from '../components/Stars';
import { FadeIn, Pop, PressScale, animateLayout, haptic, reduceMotionNow } from '../components/motion';
import { Chip, PillButton } from '../components/ui';
import { tr } from '../i18n/tr';
import { placeNameKey } from '../lib/scoring';
import { getEntry, knownPlaces, loadEntries, photoUrl, updateMetrics } from '../lib/storage';
import { brewRatio, dayKey } from '../lib/progress';
import { whenToDate, type When } from '../lib/when';
import { createCup, editCup, parseNum, type Where } from '../lib/cupSave';
import { safely } from '../lib/safe';
import { useProfile } from '../lib/useProfile';
import { GRINDS, METHODS, NOTES, type CupEntry, type Grind, type Method, type TasteNote } from '../lib/types';
import { colors, fonts, type } from '../theme';

/** Klavyenin üstündeki "Bitti" çubuğu (sayı klavyesinde ve notta Return tuşu yok). */
const KB_DONE = 'cupped-kb-done';


export default function NewCup() {
  const insets = useSafeAreaInsets();
  // ?edit=<id>: var olan fincanı düzenle (fotoğraf adımı atlanır, alanlar dolu gelir)
  // ?again=<id>: aynı fincandan bir tane daha (yöntem, mekan, menşei ve tarif dolu gelir; fotoğraf yeni)
  const { edit, again } = useLocalSearchParams<{ edit?: string; again?: string }>();
  const editId = typeof edit === 'string' && edit ? edit : null;
  const againId = !editId && typeof again === 'string' && again ? again : null;
  const [original, setOriginal] = useState<CupEntry | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const photoWidth = useRef<number | undefined>(undefined);
  const [step, setStep] = useState<'photo' | 'details'>(editId ? 'details' : 'photo');
  const [method, setMethod] = useState<Method | null>(null);
  // Düzenlemede 'keep' = fincanın kendi tarihi (değiştirilmedi)
  const [when, setWhen] = useState<When | 'keep'>(editId ? 'keep' : 'now');
  const [where, setWhere] = useState<Where | null>(null);
  const [typed, setTyped] = useState('');
  const [history, setHistory] = useState<CupEntry[]>([]);
  // Tanıtımda seçilen favori yöntem en başta
  const profile = useProfile();
  const fav = profile?.favMethod;
  const methodOrder = fav ? [fav, ...METHODS.filter((m) => m !== fav)] : METHODS;
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash] = useState(() => new Animated.Value(0));
  // Detay modu
  const [showDetail, setShowDetail] = useState(false);
  const [notes, setNotes] = useState<TasteNote[]>([]);
  const [origin, setOrigin] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [originPicker, setOriginPicker] = useState(false);
  const [dose, setDose] = useState('');
  const [water, setWater] = useState('');
  const [grind, setGrind] = useState<Grind | null>(null);
  const [note, setNote] = useState('');

  // En fazla 2 tat: 3.'ye dokununca ilk seçim sessizce düşmesin, kısa bir uyarı çıksın
  const [noteLimit, setNoteLimit] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
  }, []);
  function toggleNote(n: TasteNote) {
    if (!notes.includes(n) && notes.length >= 2) {
      haptic.medium();
      setNoteLimit(true);
      if (noteTimer.current) clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setNoteLimit(false), 2500);
      return;
    }
    setNoteLimit(false);
    setNotes((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
  }

  // H3: ekranın açılışından kayda kadar geçen süre
  const openedAt = useRef(0);
  const prefill = useRef<{ method: Method | null; where: string; typed: string }>({ method: null, where: 'null', typed: '' });
  useEffect(() => {
    openedAt.current = Date.now();
    loadEntries().then((list) => {
      setHistory(list);
      // Hızlı kayıt: yeni fincanda son kullanılan yöntem ve mekan hazır seçili gelir (değiştirmek tek dokunuş)
      const last = list[0];
      if (editId || againId || !last) return;
      const w: Where | null =
        last.venueKind === 'home'
          ? { kind: 'home' }
          : last.venueKind === 'office'
            ? { kind: 'office' }
          : last.placeName
            ? { kind: 'place', name: last.placeName }
            : null;
      // Önceden seçilenler "değişiklik" sayılmasın (Kapat'ta boşuna "vazgeçilsin mi?" sorulmasın)
      prefill.current = { method: last.method, where: JSON.stringify(w), typed: '' };
      setMethod((m) => m ?? last.method);
      setWhere((cur) => cur ?? w);
    });
    if (editId) {
      getEntry(editId).then((e) => {
        if (!e) return goBack();
        setOriginal(e);
        setPhoto(photoUrl(e.photoUri));
        setMethod(e.method);
        setWhere(e.venueKind === 'home' || e.venueKind === 'office' ? { kind: e.venueKind } : { kind: 'place', name: e.placeName ?? '' });
        setNotes(e.notes ?? []);
        setOrigin(e.origin ?? '');
        setDose(e.brew?.doseG ? String(e.brew.doseG) : '');
        setWater(e.brew?.waterMl ? String(e.brew.waterMl) : '');
        setGrind(e.brew?.grind ?? null);
        setNote(e.note ?? '');
        setRating(e.rating ?? null);
        setShowDetail(!!(e.notes?.length || e.origin || e.brew || e.note));
      });
      return;
    }
    if (againId) {
      getEntry(againId).then((e) => {
        if (!e) return;
        setMethod(e.method);
        if (e.venueKind === 'home' || e.venueKind === 'office') setWhere({ kind: e.venueKind });
        else if (e.placeName) {
          setWhere({ kind: 'place', name: e.placeName });
        }
        setOrigin(e.origin ?? '');
        setDose(e.brew?.doseG ? String(e.brew.doseG) : '');
        setWater(e.brew?.waterMl ? String(e.brew.waterMl) : '');
        setGrind(e.brew?.grind ?? null);
        setShowDetail(!!(e.origin || e.brew));
      });
    }
    updateMetrics((m) => {
      m.newOpened += 1;
    }).catch(() => {});
  }, [editId, againId]);

  // Seçili mekan her zaman bir çip olarak görünür (yazı kutusunda tekrar edilmez)
  const topPlaces = knownPlaces(history).slice(0, 6);
  const selectedName = where?.kind === 'place' && !typed.trim() ? where.name : null;
  const places =
    selectedName && !topPlaces.some((p) => placeNameKey(p) === placeNameKey(selectedName)) ? [selectedName, ...topPlaces.slice(0, 5)] : topPlaces;

  // Android: klavye açıkken Kaydet çubuğu klavyenin üstüne binmesin, yazı alanına yer kalsın
  // (iPhone'daki gibi klavye kapanınca geri gelir).
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Android geri tuşu: doğrudan çıkmasın, Kapat ile aynı davransın (girilen bilgi varsa önce sorar).
  const closeRef = useRef<() => void>(() => {});
  const formScroll = useRef<ScrollViewInstance>(null);
  const detailY = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  /** Kapat: bir şey seçildiyse önce sor (tam ekran modalda kaydırarak kapatma yok, tek çıkış burası). */
  function closeNew() {
    // Düzenlemede fotoğraf adımına yanlışlıkla geçildiyse kapat = forma dön
    if (original && step === 'photo') return setStep('details');
    const dirty = original
      ? photoChanged ||
        method !== original.method ||
        JSON.stringify(where) !==
          JSON.stringify(original.venueKind === 'home' || original.venueKind === 'office' ? { kind: original.venueKind } : { kind: 'place', name: original.placeName ?? '' }) ||
        notes.join() !== (original.notes ?? []).join() ||
        origin.trim() !== (original.origin ?? '') ||
        note.trim() !== (original.note ?? '') ||
        dose !== (original.brew?.doseG ? String(original.brew.doseG) : '') ||
        water !== (original.brew?.waterMl ? String(original.brew.waterMl) : '') ||
        grind !== (original.brew?.grind ?? null) ||
        rating !== (original.rating ?? null) ||
        when !== 'keep'
      : !!(photo ||
          (method && method !== prefill.current.method) ||
          (where && JSON.stringify(where) !== prefill.current.where) ||
          (typed.trim() && typed.trim() !== prefill.current.typed) ||
          notes.length || origin.trim() || dose || water || grind || note.trim() || rating || when !== 'now');
    if (!dirty) return goBack();
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(original ? tr.capture.discardEditTitle : tr.capture.discardTitle)) goBack();
      return;
    }
    Alert.alert(original ? tr.capture.discardEditTitle : tr.capture.discardTitle, original ? undefined : tr.capture.discardBody, [
      { text: tr.capture.keepEditing, style: 'cancel' },
      { text: tr.capture.discard, style: 'destructive', onPress: goBack },
    ]);
  }

  // Geri tuşu her zaman güncel Kapat'ı çağırsın
  useEffect(() => {
    closeRef.current = closeNew;
  });

  async function takePhoto() {
    if (!cameraReady || capturing) return;
    setCapturing(true);
    // Deklanşör flaşı (iOS kamerasındaki gibi kısa beyaz parlama)
    if (!reduceMotionNow()) {
      flash.setValue(0.85);
      Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    }
    haptic.light();
    const r = await safely(async () => cameraRef.current?.takePictureAsync({ quality: 0.6 }));
    setCapturing(false);
    if (!r.ok) {
      Alert.alert(tr.capture.cameraError);
      return;
    }
    const pic = r.value;
    if (pic?.uri) {
      photoWidth.current = pic.width;
      setPhoto(pic.uri);
      setPhotoChanged(true);
      setStep('details');
    }
  }

  async function pickFromGallery() {
    const r = await safely(() => ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 }));
    if (!r.ok) {
      Alert.alert(tr.capture.galleryError);
      return;
    }
    const res = r.value;
    if (!res.canceled && res.assets[0]?.uri) {
      photoWidth.current = res.assets[0].width;
      setPhoto(res.assets[0].uri);
      setPhotoChanged(true);
      setStep('details');
    }
  }

  function selectTyped() {
    const name = typed.trim();
    if (name) setWhere({ kind: 'place', name });
  }

  /** Formun şu anki hali (kaydetme fonksiyonlarına verilir). */
  function form(m: Method, w: Where) {
    return {
      method: m,
      where: w,
      notes,
      origin,
      dose,
      water,
      grind,
      note,
      rating,
      when: when === 'keep' ? ('now' as const) : when,
      photo,
      photoWidth: photoWidth.current,
      openedAt: openedAt.current,
    };
  }

  async function save() {
    if (!method || !where || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const r = await createCup(form(method, where));
    savingRef.current = false;
    setSaving(false);
    if (!r.ok) {
      Alert.alert(tr.capture.saveError);
      return;
    }
    haptic.success();
    const extra = {
      ...(r.badges ? { badges: r.badges } : {}),
      ...(r.evolvedFrom && r.evolvedTo ? { evolvedFrom: r.evolvedFrom, evolvedTo: r.evolvedTo } : {}),
    };
    router.replace({ pathname: '/result/[id]', params: { id: r.id, fresh: '1', ...extra } });
  }

  /** Düzenleme: skor, fincanın kendi tarihindeki geçmişe göre yeniden hesaplanır; kimlik korunur. */
  async function saveEdit(orig: CupEntry) {
    if (!method || !where || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const ok = await editCup(orig, { ...form(method, where), photoChanged, dateChanged: when !== 'keep' });
    savingRef.current = false;
    setSaving(false);
    if (!ok) {
      Alert.alert(tr.capture.saveError);
      return;
    }
    haptic.success();
    goBack();
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

        <View style={[styles.close, { top: insets.top + 8 }]}>
          <CloseButton dark onPress={closeNew} />
        </View>

        <View style={[styles.cameraBar, { paddingBottom: insets.bottom + 20 }]}>
          <PressScale onPress={pickFromGallery} scaleTo={0.93} style={styles.sideBtn}>
            <Icon name="images-outline" size={24} color={colors.onColor} />
            <Text style={styles.sideText}>{tr.capture.fromGallery}</Text>
          </PressScale>
          <PressScale
            onPress={takePhoto}
            accessibilityLabel={tr.capture.shutter}
            disabled={!permission?.granted || !cameraReady || capturing}
            scaleTo={0.9}
            style={[styles.shutter, (!permission?.granted || !cameraReady || capturing) && { opacity: 0.3 }]}
          >
            <View style={styles.shutterInner} />
          </PressScale>
          <PressScale
            onPress={() => {
              haptic.select();
              setStep('details');
            }}
            scaleTo={0.93}
            style={styles.sideBtn}
          >
            <Icon name="arrow-forward-circle-outline" size={24} color={colors.onColor} />
            <Text style={styles.sideText}>{tr.capture.skipPhoto}</Text>
          </PressScale>
        </View>
      </View>
    );
  }

  // Düzenlenen fincanın günü (bugün / dün / daha eski)
  const origDay = original
    ? dayKey(new Date(original.createdAt)) === dayKey(new Date())
      ? 'today'
      : dayKey(new Date(original.createdAt)) === dayKey(whenToDate('yesterday'))
        ? 'yesterday'
        : 'older'
    : null;

  // --- 2. adım: Nasıl? + Nerede? ---
  const typedKey = placeNameKey(typed);
  return (
    // Android'de klavye formun altındaki alanları örtmesin (iOS'ta ScrollView kendisi ayarlıyor)
    <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Fotoğraftan forma geçişte form yumuşakça belirir */}
      <FadeIn style={{ flex: 1 }}>
      <ScrollView
        ref={formScroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.topRow}>
          <CloseButton onPress={closeNew} />
          <PressScale onPress={() => setStep('photo')} hitSlop={12} scaleTo={0.95} accessibilityLabel={tr.capture.retake}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.preview} />
            ) : (
              <View style={[styles.preview, styles.previewEmpty]}>
                <Icon name="camera" size={22} color={colors.accentText} />
                <Text style={styles.previewText}>{tr.capture.addPhoto}</Text>
              </View>
            )}
          </PressScale>
        </View>

        {original ? <Text style={[type.largeTitle, { marginTop: 16 }]}>{tr.capture.editTitle}</Text> : null}
        <Text style={styles.q}>{tr.capture.how}</Text>
        <View style={styles.chips}>
          {methodOrder.map((m) => (
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
              selected={where?.kind === 'place' && placeNameKey(where.name) === placeNameKey(p)}
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
              else if (where?.kind === 'place' && placeNameKey(where.name) === typedKey) setWhere(null);
            }}
            onSubmitEditing={selectTyped}
            accessibilityLabel={tr.capture.where}
            placeholder={tr.capture.placePlaceholder}
            maxLength={80}
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
          />
          {typed.length >= 60 ? <Text style={styles.limitHint}>{tr.capture.placeLimit(typed.length, 80)}</Text> : null}
        </View>

        {/* Kişisel beğeni: isteğe bağlı, skoru etkilemez */}
        {/* Unutulan fincan dün olarak eklenebilir; düzenlemede yanlış güne eklenen fincan düzeltilebilir */}
        <Text style={styles.label}>{tr.capture.whenLabel}</Text>
        <View style={styles.chips}>
          {original ? (
            <Chip
              label={origDay === 'today' ? tr.capture.whenToday : origDay === 'yesterday' ? tr.capture.whenYesterdayShort : new Date(original.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              selected={when === 'keep'}
              onPress={() => setWhen('keep')}
            />
          ) : null}
          {/* Düzenlemede fincanın zaten olduğu gün tekrar gösterilmez */}
          {origDay !== 'today' ? (
            <Chip label={original ? tr.capture.whenToday : tr.capture.whenNow} selected={when === 'now'} onPress={() => setWhen('now')} />
          ) : null}
          {origDay !== 'yesterday' ? (
            <Chip label={original ? tr.capture.whenYesterdayShort : tr.capture.whenYesterday} selected={when === 'yesterday'} onPress={() => setWhen('yesterday')} />
          ) : null}
        </View>

        <Text style={styles.label}>{tr.rating.question}</Text>
        <StarInput value={rating} onChange={setRating} />

        <PressScale
          onPress={() => {
            haptic.select();
            animateLayout();
            const opening = !showDetail;
            setShowDetail(opening);
            // Açılınca ayrıntılar görünsün: ekran "Detay ekle" satırına kayar (alanlar ekranın altında kalmasın)
            if (opening) setTimeout(() => formScroll.current?.scrollTo({ y: Math.max(0, detailY.current - 12), animated: true }), 260);
          }}
          onLayout={(e) => (detailY.current = e.nativeEvent.layout.y)}
          hitSlop={8}
          scaleTo={0.96}
          style={styles.detailToggle}
        >
          <Icon name={showDetail ? 'chevron-up-circle-outline' : 'add-circle-outline'} size={20} color={colors.accentText} />
          <Text style={styles.detailToggleText}>{showDetail ? tr.capture.hideDetail : tr.capture.addDetail}</Text>
        </PressScale>

        {showDetail ? (
          <FadeIn>
            <Text style={styles.detailHint}>{tr.capture.detailHint}</Text>

            <Text style={styles.label}>{tr.capture.notesLabel}</Text>
            <View style={styles.chips}>
              {NOTES.map((n) => (
                <Chip key={n} label={tr.notes[n]} selected={notes.includes(n)} onPress={() => toggleNote(n)} />
              ))}
            </View>
            {noteLimit ? <Text style={styles.limitHint}>{tr.onboarding.notesLimit}</Text> : null}

            <Text style={styles.label}>{tr.capture.originLabel}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                inputAccessoryViewID={KB_DONE}
                value={origin}
                onChangeText={setOrigin}
                accessibilityLabel={tr.capture.originLabel}
                placeholder={tr.capture.originPlaceholder}
                maxLength={80}
                placeholderTextColor={colors.muted}
                style={[styles.input, { flex: 1, flexBasis: 0, minWidth: 0, marginRight: 8 }]}
              />
              <PressScale
                onPress={() => {
                  haptic.select();
                  setOriginPicker(true);
                }}
                scaleTo={0.94}
                style={styles.originBtn}
                accessibilityLabel={tr.capture.originChoose}
              >
                <Icon name="globe-outline" size={18} color={colors.white} />
                <Text style={styles.originBtnText}>{tr.capture.originChoose}</Text>
              </PressScale>
            </View>
            <OriginPicker visible={originPicker} value={origin} onChange={setOrigin} onClose={() => setOriginPicker(false)} />

            <Text style={styles.label}>
              {tr.capture.recipeLabel}
              {brewRatio(parseNum(dose), parseNum(water)) ? `  ·  ${tr.capture.ratio(brewRatio(parseNum(dose), parseNum(water))!)}` : ''}
            </Text>
            {/* Olağandışı oran: yazım hatası olabilir (ör. 1000 ml yerine 100 ml) */}
            {(() => {
              const d = parseNum(dose);
              const w = parseNum(water);
              if (!d || !w) return null;
              const r = w / d;
              if (method === 'espresso' ? r > 4 : r < 8 || r > 22) return <Text style={styles.limitHint}>{tr.capture.ratioOdd}</Text>;
              return null;
            })()}
            <View style={{ flexDirection: 'row' }}>
              <Text style={[styles.unit, { flex: 1, marginRight: 8 }]}>{tr.capture.doseLabel}</Text>
              <Text style={[styles.unit, { flex: 1 }]}>{tr.capture.waterLabel}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TextInput
              inputAccessoryViewID={KB_DONE}
                value={dose}
                onChangeText={setDose}
                accessibilityLabel={tr.capture.doseLabel}
                placeholder={tr.capture.dosePlaceholder}
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1, flexBasis: 0, minWidth: 0, marginRight: 8 }]}
              />
              <TextInput
              inputAccessoryViewID={KB_DONE}
                value={water}
                onChangeText={setWater}
                accessibilityLabel={tr.capture.waterLabel}
                placeholder={tr.capture.waterPlaceholder}
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
              accessibilityLabel={tr.capture.noteLabel}
              placeholder={tr.capture.notePlaceholder}
              maxLength={500}
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]}
            />
            {note.length >= 400 ? <Text style={styles.limitHint}>{tr.capture.placeLimit(note.length, 500)}</Text> : null}
          </FadeIn>
        ) : null}
      </ScrollView>
      </FadeIn>

      {kbOpen ? null : (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
          {/* Yöntem ve yer seçilip düğme hazır olunca hafifçe zıplar */}
          <Pop trigger={!!method && !!where} skipInitial>
            <PillButton
              label={!method ? tr.capture.chooseMethod : !where ? tr.capture.choosePlace : original ? tr.capture.saveChanges : tr.capture.save}
              onPress={original ? () => saveEdit(original) : save}
              disabled={!method || !where || saving}
            />
          </Pop>
        </View>
      )}

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={KB_DONE}>
          <View style={styles.kbBar}>
            <PressScale onPress={() => Keyboard.dismiss()} hitSlop={10} scaleTo={0.92}>
              <Text style={styles.kbDone}>{tr.capture.keyboardDone}</Text>
            </PressScale>
          </View>
        </InputAccessoryView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' },
  capturing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  permission: { flex: 1, paddingHorizontal: 28 },
  permTitle: { color: colors.onColor, fontSize: 26, fontWeight: '800' },
  permBody: { color: '#CFCAC3', fontSize: 16, marginTop: 10, lineHeight: 22 },
  close: { position: 'absolute', left: 20 },
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
  sideText: { color: colors.onColor, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: colors.onColor, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.onColor },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  previewText: { fontSize: 11, fontWeight: '700', color: colors.accentText },
  preview: { width: 72, height: 72, borderRadius: 16 },
  previewEmpty: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent, gap: 2 },
  q: { ...type.title2, marginTop: 24, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  inputRow: { marginTop: 4 },
  detailToggle: { marginTop: 24, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailToggleText: { fontSize: 16, fontWeight: '800', color: colors.accentText },
  limitHint: { ...type.footnote, color: colors.accentText, marginTop: 2 },
  detailHint: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 8 },
  // Tüm soru başlıkları aynı ailede (Fraunces); ana sorular (Nasıl?, Nerede?) biraz daha büyük
  label: { fontFamily: fonts.display, fontSize: 18, color: colors.text, marginTop: 22, marginBottom: 10 },
  unit: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  originBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.black, borderRadius: 14, paddingHorizontal: 12, height: 50 },
  originBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
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
  kbBar: { flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  kbDone: { fontSize: 16, fontWeight: '800', color: colors.accentText },
});
