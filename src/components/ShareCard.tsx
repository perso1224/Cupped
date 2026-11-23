import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../config/brand';
import { tr, upper } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { photoUrl } from '../lib/storage';
import type { CupEntry } from '../lib/types';
import { colors, fonts } from '../theme';
import { Icon } from './Icon';
import { ScoreRing } from './ScoreRing';
import { useDamakCode } from '../lib/useDamakCode';

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
  const code = useDamakCode(); // davet: kartı gören, kodu Damak Uyumu'na yazabilir
  const u = width / 100; // yazılar kartla birlikte ölçeklenir (önizleme ve 1080 px görsel aynı görünsün)

  return (
    // Önizlemede kartın kenarı belli olsun (çerçeve paylaşılan görsele girmez)
    <View
      style={{ width, height, borderRadius: 28, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }}
      // Ekran okuyucu kartı tek cümleyle okur (her yazıyı tek tek tekrar etmesin)
      accessible
      accessibilityRole="image"
      accessibilityLabel={tr.a11y.shareCardPreview(tr.methods[entry.method], entry.score, type.name)}
    >
      <View ref={ref} collapsable={false} style={[styles.card, { width, height }]}>
        <View style={{ height: photoH, backgroundColor: colors.accentSoft }}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadEnd={onImageLoaded} />
          ) : (
            <View style={styles.noPhoto}>
              <Icon name="cafe" size={u * 20} color={colors.accent} />
            </View>
          )}
          <View style={[styles.badge, { top: height * 0.13 }]}>
            <Text allowFontScaling={false} style={[styles.badgeText, { fontSize: u * 3.6 }]} numberOfLines={1}>
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
          <ScoreRing score={entry.score} size={ringSize} stroke={ringSize * 0.08} animate={animate} onAnimationEnd={onAnimationEnd} />
        </View>

        <View style={styles.body}>
          <Text allowFontScaling={false} style={[styles.kicker, { fontSize: u * 3.2 }]}>
            {upper(tr.card.cupScore)}
          </Text>
          {/* Uzun tip adları ("Üçüncü Dalga Gezgini") kesilmesin: iki satıra kadar */}
          <Text allowFontScaling={false} style={[styles.typeName, { fontSize: u * 8, lineHeight: u * 9.4 }]} numberOfLines={2}>
            {type.name}
          </Text>
          <Text allowFontScaling={false} style={[styles.tagline, { fontSize: u * 3.7, lineHeight: u * 5.2 }]} numberOfLines={3}>
            {type.tagline}
          </Text>
        </View>

        {/* Alt yazı akışta: uzun slogan olsa da üst üste binmez; Instagram'ın alt arayüzünün üstünde kalır */}
        <View style={[styles.footer, { paddingBottom: height * 0.17 }]}>
          <Text allowFontScaling={false} style={[styles.question, { fontSize: u * 4.8 }]}>
            {tr.card.question}
          </Text>
          <Text allowFontScaling={false} style={[styles.brandLine, { fontSize: u * 3.2 }]}>
            <Text style={styles.brand}>{BRAND.name}</Text>
            {'  ·  '}
            {code ? tr.card.inviteCode(code) : tr.card.explainer}
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
  badgeText: { color: colors.onColor, fontWeight: '700' },
  ringWrap: { alignSelf: 'center', backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', paddingHorizontal: 24 },
  kicker: { fontWeight: '800', color: colors.accentText, letterSpacing: 1.2 },
  typeName: { fontFamily: fonts.heavy, color: colors.text, marginTop: 4, textAlign: 'center' },
  tagline: { color: colors.muted, textAlign: 'center', marginTop: 6 },
  footer: { marginTop: 'auto', paddingHorizontal: 16, alignItems: 'center' },
  question: { fontFamily: fonts.display, color: colors.text, textAlign: 'center' },
  brandLine: { color: colors.muted, marginTop: 4, fontWeight: '600', textAlign: 'center' },
  brand: { fontFamily: fonts.heavy, color: colors.text },
});
