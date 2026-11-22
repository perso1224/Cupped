import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { placeLabel, ShareCard, type CardHandle } from './ShareCard';
import { CupGauge } from './coffee';
import { MetricTile } from './dashboard';
import { BadgeArt, CelebratedBadge } from './BadgeArt';
import { Stars } from './Stars';
import { Icon, type IconName } from './Icon';
import { ListRow, ListSection } from './List';
import { GlassIconButton, goBack } from './NavButtons';
import { Card, PillButton } from './ui';
import { Confetti, CountUp, FadeIn, Pop, PressScale, haptic } from './motion';
import { BADGES, PART_MAX } from '../config/scoring.config';
import { tr } from '../i18n/tr';
import { brewRatio, isDetailed, trNum } from '../lib/progress';
import { refreshReminder } from '../lib/reminders';
import { shareViewSafely } from '../lib/share';
import { getPalateType } from '../lib/palate';
import { partsSummary } from '../lib/scoring';
import { bumpCounter, deleteEntry, getEntry, photoUrl } from '../lib/storage';
import type { CupEntry } from '../lib/types';
import { colors, fonts, layout, tint, type } from '../theme';

/**
 * Fincan ekranı. mode='result': yeni kayıttan sonra alttan sayfa (Tamam + Paylaş).
 * mode='detail': listeden açılan yığın ekranı (sağdan kayar, üstte Geri).
 */
export function CupScreen({ mode }: { mode: 'result' | 'detail' }) {
  const { id, fresh, badges, evolvedFrom, evolvedTo } = useLocalSearchParams<{ id: string; fresh?: string; badges?: string; evolvedFrom?: string; evolvedTo?: string }>();
  const newBadges = (badges ?? '')
    .split(',')
    .map((b) => BADGES.find((x) => x.id === b))
    .filter((b): b is NonNullable<typeof b> => !!b);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardRef = useRef<CardHandle>(null);
  const [entry, setEntry] = useState<CupEntry | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  const busy = useRef(false);
  const isFresh = fresh === '1';
  // Paylaşım, skor animasyonu bitmeden ve fotoğraf yüklenmeden yapılmasın (yoksa kartta yarım skor çıkar).
  const [animDone, setAnimDone] = useState(!isFresh);
  const [imageDone, setImageDone] = useState(false);
  // Puan sayımı bitince (~1,1 sn) kutlama: konfeti + hafif titreşim
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (!isFresh) return;
    const t = setTimeout(() => {
      setCelebrate(true);
      haptic.medium();
    }, 1150);
    return () => clearTimeout(t);
  }, [isFresh]);

  // Düzenleme ekranından dönünce güncel hali göster.
  // Kayıt değişmediyse kartı yeniden çizme (skor animasyonu baştan başlamasın);
  // fotoğraf değiştiyse yeni fotoğraf yüklenene kadar paylaşımı kilitle.
  const shown = useRef<string | null>(null);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollY] = useState(() => new Animated.Value(0));
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getEntry(String(id)).then((e) => {
        if (!alive) return;
        const json = e ? JSON.stringify(e) : 'null';
        if (json === shown.current) return;
        const prevPhoto = shown.current && shown.current !== 'null' ? (JSON.parse(shown.current) as CupEntry).photoUri : undefined;
        shown.current = json;
        setEntry(e ?? null);
        if (!e?.photoUri) setImageDone(true);
        else if (e.photoUri !== prevPhoto) {
          setImageDone(false);
          // Fotoğraf hiç yüklenmezse bile paylaşım sonsuza kadar kilitli kalmasın. Fotoğraf yine değişirse
          // önceki zamanlayıcı iptal edilir (yeni fotoğraf yüklenmeden paylaşım açılmasın).
          if (unlockTimer.current) clearTimeout(unlockTimer.current);
          unlockTimer.current = setTimeout(() => setImageDone(true), 2500);
        }
      });
      return () => {
        alive = false; // fallback zamanlayıcısı bilerek iptal edilmez: ekrandan kısa süre ayrılınca paylaşım kilitli kalmasın
      };
    }, [id, setImageDone]),
  );

  useEffect(() => {
    // H2 ölçümü: yeni kayıt sonrası üretilen kart sayısı
    if (isFresh) bumpCounter('cardsGenerated').catch(() => {});
  }, [id, isFresh]);

  // Yeni rozet: kart belirirken bir kez başarı titreşimi
  const hasNewBadge = newBadges.length > 0;
  useEffect(() => {
    if (!hasNewBadge) return;
    const t = setTimeout(() => haptic.success(), 1350);
    return () => clearTimeout(t);
  }, [hasNewBadge]);

  async function doDelete() {
    try {
      await deleteEntry(String(id));
      refreshReminder();
      goBack();
    } catch {
      Alert.alert(tr.result.deleteError);
    }
  }

  function confirmDelete() {
    if (Platform.OS === 'web') {
      // Tarayıcıda Alert düğmeleri çalışmaz (sadece test için)
      if (globalThis.confirm?.(`${tr.result.deleteTitle}\n${tr.result.deleteBody}`)) doDelete();
      return;
    }
    Alert.alert(tr.result.deleteTitle, tr.result.deleteBody, [
      { text: tr.result.cancel, style: 'cancel' },
      {
        text: tr.result.delete,
        style: 'destructive',
        onPress: doDelete,
      },
    ]);
  }

  async function share() {
    if (!cardRef.current || busy.current) return;
    busy.current = true;
    setSharing(true);
    if ((await shareViewSafely(cardRef, 'cup', String(id))) === 'error') Alert.alert(tr.result.shareError);
    busy.current = false;
    setSharing(false);
  }

  function edit() {
    router.push({ pathname: '/new', params: { edit: String(id) } });
  }

  if (entry === undefined) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (entry === null) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>{tr.result.notFound}</Text>
        <PillButton label={tr.result.done} onPress={goBack} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const cardWidth = Math.min(width - layout.screenPad * 2, 420);
  const photo = photoUrl(entry.photoUri);
  const heroH = photo ? Math.min(Math.round(width * 0.92), 440) : 190;
  const barH = (mode === 'detail' ? insets.top : 0) + 68;
  const shareReady = !sharing && animDone && imageDone;
  const when = new Date(entry.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const place = placeLabel(entry);
  const extras = [
    `${tr.result.breakdown.base} ${entry.parts.base}`,
    entry.parts.selectivity ? `${tr.result.breakdown.selectivity} ${entry.parts.selectivity > 0 ? '+' : ''}${entry.parts.selectivity}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: mode === 'result' ? insets.bottom + 110 : insets.bottom + 40 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {/* Fotoğraf ekranın yıldızı: üstte tam genişlik. Fotoğraf yoksa sıcak bir yer tutucu. */}
        <View style={[styles.hero, { height: heroH }]}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <Icon name="cafe" size={64} color={colors.accent} />
          )}
        </View>

        {/* Fotoğrafın üstüne doğru çekilmiş bilgi kartı */}
        <View style={styles.sheet}>
          {/* Yeni kayıtta bölümler sırayla süzülerek gelir; detay ekranında doğrudan görünür */}
          <FadeIn disabled={!isFresh} index={0}>
            <View style={styles.timeChip}>
              <Icon name="time-outline" size={14} color={colors.muted} />
              <Text style={styles.timeText}>{when}</Text>
            </View>
            <Text style={styles.title}>{tr.methods[entry.method]}</Text>
            {place ? <Text style={styles.place}>{place}</Text> : null}
            {entry.rating ? (
              <View style={{ marginTop: 8 }}>
                <Stars value={entry.rating} size={20} />
              </View>
            ) : null}
          </FadeIn>

          {evolvedFrom && evolvedTo ? (
            <Pop delay={1100} style={styles.newBadge}>
              <View style={[styles.evoIcon]}>
                <Icon name="sparkles" size={22} color={colors.onColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.newBadgeKicker}>{tr.evolution.kicker}</Text>
                <Text style={styles.newBadgeName}>{tr.evolution.line(getPalateType(evolvedFrom).name, getPalateType(evolvedTo).name)}</Text>
                <PressScale
                  onPress={() => router.push({ pathname: '/evolution', params: { from: evolvedFrom, to: evolvedTo } })}
                  scaleTo={0.96}
                  style={styles.evoBtn}
                >
                  <Text style={styles.evoBtnText}>{tr.evolution.open}</Text>
                </PressScale>
              </View>
            </Pop>
          ) : null}

          {newBadges.map((b, i) => (
            <Pop key={b.id} delay={1300 + i * 250} style={styles.newBadge}>
              {/* Rozet büyüyerek gelir, arkasında dönen ışıltı (yalnızca yeni kayıtta) */}
              <View style={{ marginRight: 16, marginLeft: 4 }}>
                {isFresh ? <CelebratedBadge id={b.id} size={64} delay={1450 + i * 250} /> : <BadgeArt id={b.id} earned size={64} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.newBadgeKicker}>{tr.result.newBadge}</Text>
                <Text style={styles.newBadgeName}>{b.name}</Text>
                <Text style={styles.newBadgeDesc}>{b.description}</Text>
              </View>
            </Pop>
          ))}

          {/* Tek, kocaman skor */}
          <FadeIn disabled={!isFresh} index={1}>
            <Card style={styles.scoreCard}>
              <View style={{ flex: 1 }}>
                {isFresh ? <CountUp value={entry.score} style={styles.scoreNumber} duration={1100} /> : <Text style={styles.scoreNumber}>{entry.score}</Text>}
                <Text style={styles.scoreLabel}>{tr.card.cupScore}</Text>
                <Text style={styles.scoreSub}>{partsSummary(entry.parts, tr.result.breakdown)}</Text>
              </View>
              <CupGauge size={104} fraction={entry.score / 100} animate={isFresh} />
            </Card>
          </FadeIn>

          {/* Skor nereden geldi: üç küçük kutu (ana sayfadakiyle aynı renkler) */}
          <FadeIn disabled={!isFresh} index={2}>
            <View style={styles.tiles}>
              <MetricTile value={signed(entry.parts.effort)} label={tr.result.breakdown.effort} fraction={entry.parts.effort / PART_MAX.effort} color={tint.amber} icon="hand-left" />
              <MetricTile value={signed(entry.parts.discovery)} label={tr.result.breakdown.discovery} fraction={entry.parts.discovery / PART_MAX.discovery} color={tint.cherry} icon="compass" />
              <MetricTile value={signed(entry.parts.depth)} label={tr.result.breakdown.depth} fraction={entry.parts.depth / PART_MAX.depth} color={tint.espresso} icon="leaf" />
            </View>
            <Text style={styles.extras}>{extras}</Text>
            <PressScale
              onPress={() => Alert.alert(tr.scoreHelp.title, tr.scoreHelp.body)}
              hitSlop={10}
              scaleTo={0.95}
              style={styles.helpLink}
              accessibilityRole="button"
            >
              <Icon name="help-circle-outline" size={16} color={colors.accentText} />
              <Text style={styles.helpText}>{tr.scoreHelp.link}</Text>
            </PressScale>
          </FadeIn>

          {isDetailed(entry) ? <Details entry={entry} /> : null}

          <Text style={styles.section}>{tr.result.shareCard}</Text>
          <View style={{ alignItems: 'center' }}>
            <ShareCard
              ref={cardRef}
              entry={entry}
              width={cardWidth}
              animate={isFresh}
              onAnimationEnd={() => setAnimDone(true)}
              onImageLoaded={() => setImageDone(true)}
            />
          </View>

          <ListSection footer={mode === 'detail' ? tr.result.editHint : undefined}>
            {mode === 'detail' ? (
              <ListRow
                icon="repeat"
                tint={colors.black}
                title={tr.result.again}
                onPress={() => router.push({ pathname: '/new', params: { again: String(id) } })}
              />
            ) : null}
            {mode === 'detail' ? (
              <ListRow icon="create" tint={colors.accent} title={tr.result.edit} onPress={edit} />
            ) : null}
            <ListRow icon="trash" tint={colors.danger} title={tr.result.delete} destructive onPress={confirmDelete} />
          </ListSection>
        </View>
      </Animated.ScrollView>

      {/* Fotoğraf kaydırılıp geçince üstte ince bir zemin belirir: daire düğmeler yazının üstüne binmesin */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.topShade,
          {
            height: barH,
            opacity: scrollY.interpolate({ inputRange: [heroH - barH - 40, heroH - barH], outputRange: [0, 1], extrapolate: 'clamp' }),
          },
        ]}
      />

      {/* Fotoğrafın üstünde yüzen düğmeler: solda geri (detayda), sağda paylaş */}
      <View style={[styles.topButtons, { top: (mode === 'detail' ? insets.top : 0) + 12 }]} pointerEvents="box-none">
        {mode === 'detail' ? <RoundButton icon="chevron-back" label={tr.settings.back} onPress={goBack} /> : <View />}
        <RoundButton icon="share-outline" label={tr.result.share} onPress={share} disabled={!shareReady} />
      </View>

      {/* Yeni fincan: puan yerine oturunca kahve renklerinde konfeti */}
      {isFresh ? <Confetti play={celebrate} /> : null}

      {mode === 'result' ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
          <PillButton label={tr.result.edit} variant="light" onPress={edit} style={{ flex: 1, marginRight: 10 }} />
          <PillButton label={tr.result.done} onPress={goBack} style={{ flex: 1 }} />
        </View>
      ) : null}
    </View>
  );

}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

/** Fotoğraf üstünde daire düğme: iOS 26+'da koyu Liquid Glass, diğerlerinde yarı saydam koyu daire. */
function RoundButton({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <GlassIconButton
      icon={icon}
      iconSize={22}
      label={label}
      onPress={onPress}
      disabled={disabled}
      color={colors.onColor}
      tint="rgba(0,0,0,0.3)"
      fallback={styles.round}
    />
  );
}

function Details({ entry }: { entry: CupEntry }) {
  const b = entry.brew;
  const recipe = b
    ? [
        b.doseG ? `${trNum(b.doseG)} g` : null,
        b.waterMl ? `${trNum(b.waterMl)} ml` : null,
        brewRatio(b.doseG, b.waterMl),
        b.grind ? tr.capture.grind[b.grind] : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  return (
    <View style={styles.details}>
      <View style={styles.detailsHead}>
        <Text style={styles.detailsTitle}>{tr.result.details}</Text>
      </View>
      {entry.notes.length ? <Text style={[styles.detailLabel, { marginTop: 4 }]}>{tr.result.notesLabel}</Text> : null}
      {entry.notes.length ? (
        <View style={styles.noteRow}>
          {entry.notes.map((n) => (
            <View key={n} style={styles.noteChip}>
              <Text style={styles.noteChipText}>{tr.notes[n]}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {entry.origin ? <DetailLine label={tr.result.origin} value={entry.origin} /> : null}
      {recipe ? <DetailLine label={tr.result.recipe} value={recipe} /> : null}
      {entry.note ? <DetailLine label={tr.result.note} value={entry.note} /> : null}
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sheet: {
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.bg,
    paddingHorizontal: layout.screenPad,
    paddingTop: 18,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timeText: { ...type.caption, color: colors.muted },
  title: { ...type.largeTitle, fontSize: 30, marginTop: 10 },
  place: { ...type.subhead, marginTop: 2 },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 18,
    shadowColor: '#2B1A12',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  scoreNumber: { fontSize: 60, fontFamily: fonts.heavy, color: colors.text },
  scoreLabel: { ...type.footnote, fontWeight: '600', color: colors.text },
  scoreSub: { ...type.footnote, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 10 },
  helpLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginTop: 8, paddingVertical: 6 },
  helpText: { ...type.footnote, color: colors.accentText, fontWeight: '700' },
  extras: { ...type.caption, textAlign: 'center', marginTop: 10 },
  section: { ...type.title2, marginTop: 28, marginBottom: 12 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  topButtons: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  evoIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  evoBtn: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  evoBtnText: { color: colors.onColor, fontWeight: '800', fontSize: 13 },
  newBadgeKicker: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  newBadgeName: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 2 },
  newBadgeDesc: { color: colors.mutedOnDark, fontSize: 13, marginTop: 2 },
  deleteText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  details: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginTop: 18 },
  detailsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  noteRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  noteChip: { backgroundColor: colors.black, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  noteChipText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  detailLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  detailValue: { fontSize: 15, color: colors.text, marginTop: 2, lineHeight: 21 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  muted: { color: colors.muted, fontSize: 16 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bg,
  },
});
