import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShareCard, type CardHandle } from './ShareCard';
import { Icon } from './Icon';
import { ListRow, ListSection } from './List';
import { BackButton, goBack } from './NavButtons';
import { PillButton } from './ui';
import { Pop, haptic } from './motion';
import { BADGES } from '../config/scoring.config';
import { tr } from '../i18n/tr';
import { brewRatio, isDetailed } from '../lib/progress';
import { refreshReminder } from '../lib/reminders';
import { shareViewAsImage } from '../lib/share';
import { bumpCounter, deleteEntry, getEntry } from '../lib/storage';
import type { CupEntry, ScoreParts } from '../lib/types';
import { colors, layout } from '../theme';

const PART_ORDER: (keyof ScoreParts)[] = ['base', 'effort', 'discovery', 'depth', 'selectivity'];

/**
 * Fincan ekranı. mode='result': yeni kayıttan sonra alttan sayfa (Tamam + Paylaş).
 * mode='detail': listeden açılan yığın ekranı (sağdan kayar, üstte Geri).
 */
export function CupScreen({ mode }: { mode: 'result' | 'detail' }) {
  const { id, fresh, badges } = useLocalSearchParams<{ id: string; fresh?: string; badges?: string }>();
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

  // Düzenleme ekranından dönünce güncel hali göster.
  // Kayıt değişmediyse kartı yeniden çizme (skor animasyonu baştan başlamasın);
  // fotoğraf değiştiyse yeni fotoğraf yüklenene kadar paylaşımı kilitle.
  const shown = useRef<string | null>(null);
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
          // Fotoğraf hiç yüklenmezse bile paylaşım sonsuza kadar kilitli kalmasın.
          setTimeout(() => setImageDone(true), 2500);
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
    try {
      await shareViewAsImage(cardRef, 'cup', String(id));
    } catch {
      Alert.alert(tr.result.shareError);
    } finally {
      busy.current = false;
      setSharing(false);
    }
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

  const cardWidth = Math.min(width - 32, 420);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: mode === 'detail' ? insets.top + layout.topPad : 16, paddingBottom: 160, alignItems: 'center' }}
      >
        {mode === 'detail' ? (
          <View style={{ alignSelf: 'stretch', paddingHorizontal: layout.screenPad, marginBottom: 12 }}>
            <BackButton label={tr.settings.back} />
          </View>
        ) : null}
        {newBadges.map((b, i) => (
          <Pop key={b.id} delay={1300 + i * 250} style={[styles.newBadge, { width: cardWidth }]}>
            <View style={styles.newBadgeIcon}>
              <Icon name="ribbon" size={22} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.newBadgeKicker}>{tr.result.newBadge}</Text>
              <Text style={styles.newBadgeName}>{b.name}</Text>
              <Text style={styles.newBadgeDesc}>{b.description}</Text>
            </View>
          </Pop>
        ))}

        <View style={[styles.parts, { width: cardWidth, marginTop: 0, marginBottom: 12 }]}>
          {PART_ORDER.filter((k) => entry.parts[k] !== 0).map((k) => (
            <View key={k} style={styles.part}>
              <Text style={styles.partValue}>
                {entry.parts[k] > 0 ? '+' : ''}
                {entry.parts[k]}
              </Text>
              <Text style={styles.partLabel} numberOfLines={1} adjustsFontSizeToFit>
                {tr.result.breakdown[k]}
              </Text>
            </View>
          ))}
        </View>

        <ShareCard
          ref={cardRef}
          entry={entry}
          width={cardWidth}
          animate={isFresh}
          onAnimationEnd={() => setAnimDone(true)}
          onImageLoaded={() => setImageDone(true)}
        />

        {isDetailed(entry) ? <Details entry={entry} width={cardWidth} /> : null}

        <View style={{ alignSelf: 'stretch', paddingHorizontal: 16 }}>
          <ListSection footer={tr.result.editHint}>
            {mode === 'detail' ? (
              <ListRow
                icon="repeat"
                tint={colors.black}
                title={tr.result.again}
                onPress={() => router.push({ pathname: '/new', params: { again: String(id) } })}
              />
            ) : null}
            <ListRow
              icon="create"
              tint={colors.accent}
              title={tr.result.edit}
              onPress={() => router.push({ pathname: '/new', params: { edit: String(id) } })}
            />
            <ListRow icon="trash" tint={colors.danger} title={tr.result.delete} destructive onPress={confirmDelete} />
          </ListSection>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        {mode === 'result' ? (
          <PillButton label={tr.result.done} variant="light" onPress={goBack} style={{ flex: 1, marginRight: 10 }} />
        ) : null}
        <PillButton label={tr.result.share} onPress={share} disabled={sharing || !animDone || !imageDone} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

function Details({ entry, width }: { entry: CupEntry; width: number }) {
  const b = entry.brew;
  const recipe = b
    ? [
        b.doseG ? `${b.doseG} g` : null,
        b.waterMl ? `${b.waterMl} ml` : null,
        brewRatio(b.doseG, b.waterMl),
        b.grind ? tr.capture.grind[b.grind] : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  return (
    <View style={[styles.details, { width }]}>
      <View style={styles.detailsHead}>
        <Text style={styles.detailsTitle}>{tr.result.details}</Text>
        <View style={styles.depthChip}>
          <Text style={styles.depthChipText}>{tr.result.depthChip}</Text>
        </View>
      </View>
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
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  newBadgeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  newBadgeKicker: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  newBadgeName: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 2 },
  newBadgeDesc: { color: colors.mutedOnDark, fontSize: 13, marginTop: 2 },
  deleteText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  details: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginTop: 16 },
  detailsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  depthChip: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  depthChipText: { color: colors.accentText, fontWeight: '800', fontSize: 12 },
  noteRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  noteChip: { backgroundColor: colors.black, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  noteChipText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  detailLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  detailValue: { fontSize: 15, color: colors.text, marginTop: 2, lineHeight: 21 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  muted: { color: colors.muted, fontSize: 16 },
  // Skor parçaları tek satırda (SE'de de 4-5 parça sığar)
  parts: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  part: {
    flex: 1,
    maxWidth: 90,
    minWidth: 0,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  partValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  partLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
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
