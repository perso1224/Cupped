import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../config/brand';
import { tr, upper } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { photoUrl } from '../lib/storage';
import type { CupEntry } from '../lib/types';
// Paylaşılan görsel: uygulama koyu temada olsa da hep açık renkli kart
import { lightColors as colors } from '../theme';
import { ScoreRing } from './ScoreRing';

export function placeLabel(entry: Pick<CupEntry, 'venueKind' | 'placeName'>): string {
  if (entry.venueKind === 'home') return tr.card.homeBrew;
  if (entry.venueKind === 'office') return tr.card.office;
  return entry.placeName?.trim() ?? '';
}

export type CardHandle = ComponentRef<typeof View>;

/**
 * 9:16 paylaşım kartı (Instagram Story / WhatsApp durumu).
 * Instagram'ın üst (~%13) ve alt (~%18) arayüzü kartın üstüne biner; önemli yazılar bu bölgelerin dışında.
 * Seviye etiketi kartta gösterilmez (kurucu kararı: utandırmasın).
 */
export function ShareCard({
  entry,
  width,
  animate,
  onAnimationEnd,
  onImageLoaded,
  ref,
}: {
  entry: CupEntry;
  width: number;
  animate?: boolean;
  onAnimationEnd?: () => void;
  onImageLoaded?: () => void;
  ref?: Ref<CardHandle>;
}) {
  const height = (width * 16) / 9;
  const type = getPalateType(entry.palateTypeId);
  const photoH = height * 0.44;
  const ringSize = width * 0.34;
  const photo = photoUrl(entry.photoUri);

  return (
    <View style={{ width, height, borderRadius: 28, overflow: 'hidden' }}>
      <View ref={ref} collapsable={false} style={[styles.card, { width, height }]}>
        <View style={{ height: photoH, backgroundColor: colors.accentSoft }}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadEnd={onImageLoaded} />
          ) : (
            <View style={styles.noPhoto}>
              <Text allowFontScaling={false} style={{ fontSize: width * 0.22 }}>☕</Text>
            </View>
          )}
          <View style={[styles.badge, { top: height * 0.13 }]}>
            <Text allowFontScaling={false} style={styles.badgeText} numberOfLines={1}>
              {tr.methods[entry.method]} · {placeLabel(entry)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.ringWrap,
            { marginTop: -ringSize / 2 - 8, width: ringSize + 16, height: ringSize + 16, borderRadius: (ringSize + 16) / 2 },
          ]}
        >
          <ScoreRing score={entry.score} size={ringSize} stroke={ringSize * 0.08} animate={animate} onAnimationEnd={onAnimationEnd} palette={colors} />
        </View>

        <View style={styles.body}>
          <Text allowFontScaling={false} style={styles.kicker}>
            {upper(tr.card.cupScore)}
          </Text>
          <Text allowFontScaling={false} style={[styles.typeName, { fontSize: width * 0.1 }]} numberOfLines={1} adjustsFontSizeToFit>
            {type.name}
          </Text>
          <Text allowFontScaling={false} style={styles.tagline} numberOfLines={2}>
            {type.tagline}
          </Text>
        </View>

        <View style={[styles.footer, { bottom: height * 0.17 }]}>
          <Text allowFontScaling={false} style={styles.question}>
            {tr.card.question}
          </Text>
          <Text allowFontScaling={false} style={styles.brandLine}>
            <Text style={styles.brand}>{BRAND.name}</Text>
            {'  ·  '}
            {tr.card.explainer}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, overflow: 'hidden' },
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(17,17,17,0.78)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '88%',
  },
  badgeText: { color: colors.onColor, fontWeight: '700', fontSize: 13 },
  ringWrap: { alignSelf: 'center', backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', paddingHorizontal: 24 },
  kicker: { fontSize: 12, fontWeight: '800', color: colors.accentText, letterSpacing: 1.2 },
  typeName: { fontWeight: '900', color: colors.text, marginTop: 4, textAlign: 'center', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  footer: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  question: { fontSize: 18, fontWeight: '900', color: colors.text },
  brandLine: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '600' },
  brand: { fontWeight: '900', color: colors.text },
});
