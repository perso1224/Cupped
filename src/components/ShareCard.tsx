import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../config/brand';
import { tr } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { levelFor } from '../lib/scoring';
import type { CupEntry } from '../lib/types';
import { colors } from '../theme';
import { ScoreRing } from './ScoreRing';

export function placeLabel(entry: Pick<CupEntry, 'venueKind' | 'placeName'>): string {
  if (entry.venueKind === 'home') return tr.card.homeBrew;
  if (entry.venueKind === 'office') return tr.card.office;
  return entry.placeName ?? '';
}

/** 9:16 paylaşım kartı (Instagram Story / WhatsApp durumu oranı). */
export type CardHandle = ComponentRef<typeof View>;

export function ShareCard({
  entry,
  width,
  animate,
  onAnimationEnd,
  ref,
}: {
  entry: CupEntry;
  width: number;
  animate?: boolean;
  onAnimationEnd?: () => void;
  ref?: Ref<CardHandle>;
}) {
  const height = (width * 16) / 9;
  const type = getPalateType(entry.palateTypeId);
  const photoH = height * 0.5;
  const ringSize = width * 0.42;

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height }]}>
      <View style={{ height: photoH, backgroundColor: colors.accentSoft }}>
        {entry.photoUri ? (
          <Image source={{ uri: entry.photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.noPhoto}>
            <Text style={{ fontSize: width * 0.25 }}>☕</Text>
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {tr.methods[entry.method]} · {placeLabel(entry)}
          </Text>
        </View>
      </View>

      <View style={[styles.ringWrap, { marginTop: -ringSize / 2, width: ringSize + 16, height: ringSize + 16, borderRadius: (ringSize + 16) / 2 }]}>
        <ScoreRing score={entry.score} size={ringSize} stroke={ringSize * 0.075} animate={animate} onAnimationEnd={onAnimationEnd} />
      </View>

      <View style={styles.body}>
        <Text style={styles.level}>
          {tr.card.cupScore} · {levelFor(entry.score)}
        </Text>
        <Text style={[styles.typeName, { fontSize: width * 0.085 }]} numberOfLines={1} adjustsFontSizeToFit>
          {type.name}
        </Text>
        <Text style={styles.tagline}>{type.tagline}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.question}>{tr.card.question}</Text>
        <Text style={styles.brand}>{BRAND.name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: 28, overflow: 'hidden' },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(17,17,17,0.78)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '85%',
  },
  badgeText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  ringWrap: {
    alignSelf: 'center',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { alignItems: 'center', paddingHorizontal: 24, marginTop: 4 },
  level: { fontSize: 13, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1 },
  typeName: { fontWeight: '900', color: colors.text, marginTop: 6, textAlign: 'center' },
  tagline: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  question: { fontSize: 13, fontWeight: '600', color: colors.muted },
  brand: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
});
