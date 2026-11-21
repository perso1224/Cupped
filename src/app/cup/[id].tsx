import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShareCard, type CardHandle } from '../../components/ShareCard';
import { PillButton } from '../../components/ui';
import { Pop, haptic } from '../../components/motion';
import { BADGES } from '../../config/scoring.config';
import { tr } from '../../i18n/tr';
import { brewRatio, isDetailed } from '../../lib/progress';
import { shareViewAsImage } from '../../lib/share';
import { bumpCounter, deleteEntry, getEntry } from '../../lib/storage';
import type { CupEntry, ScoreParts } from '../../lib/types';
import { colors } from '../../theme';

const PART_ORDER: (keyof ScoreParts)[] = ['base', 'effort', 'discovery', 'depth', 'selectivity'];

export default function CupResult() {
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

  useEffect(() => {
    getEntry(String(id)).then((e) => {
      setEntry(e ?? null);
      if (!e?.photoUri) setImageDone(true);
    });
    // Fotoğraf hiç yüklenmezse bile paylaşım sonsuza kadar kilitli kalmasın.
    const t = setTimeout(() => setImageDone(true), 2500);
    // H2 ölçümü: yeni kayıt sonrası üretilen kart sayısı
    if (isFresh) bumpCounter('cardsGenerated').catch(() => {});
    return () => clearTimeout(t);
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
      router.back();
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
        <PillButton label={tr.result.done} onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const cardWidth = Math.min(width - 32, 420);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 160, alignItems: 'center' }}>
        {newBadges.map((b, i) => (
          <Pop key={b.id} delay={1300 + i * 250} style={[styles.newBadge, { width: cardWidth }]}>
            <Text style={styles.newBadgeIcon}>🏅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.newBadgeKicker}>{tr.result.newBadge}</Text>
              <Text style={styles.newBadgeName}>{b.name}</Text>
              <Text style={styles.newBadgeDesc}>{b.description}</Text>
            </View>
          </Pop>
        ))}

        <View style={[styles.parts, { marginTop: 0, marginBottom: 12 }]}>
          {PART_ORDER.filter((k) => entry.parts[k] !== 0).map((k) => (
            <View key={k} style={styles.part}>
              <Text style={styles.partValue}>
                {entry.parts[k] > 0 ? '+' : ''}
                {entry.parts[k]}
              </Text>
              <Text style={styles.partLabel}>{tr.result.breakdown[k]}</Text>
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

        <Pressable onPress={confirmDelete} hitSlop={10} style={{ marginTop: 24 }}>
          <Text style={styles.deleteText}>{tr.result.delete}</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <PillButton label={tr.result.done} variant="light" onPress={() => router.back()} style={{ flex: 1, marginRight: 10 }} />
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
  newBadgeIcon: { fontSize: 34, marginRight: 12 },
  newBadgeKicker: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  newBadgeName: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 2 },
  newBadgeDesc: { color: '#CFC8BE', fontSize: 13, marginTop: 2 },
  deleteText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  details: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginTop: 16 },
  detailsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  depthChip: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  depthChipText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  noteRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  noteChip: { backgroundColor: colors.black, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  noteChipText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  detailLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  detailValue: { fontSize: 15, color: colors.text, marginTop: 2, lineHeight: 21 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  muted: { color: colors.muted, fontSize: 16 },
  parts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, paddingHorizontal: 20 },
  part: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    margin: 4,
    alignItems: 'center',
    minWidth: 76,
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
