import { useState, type ReactNode } from 'react';
import { usePagePad } from '../lib/contentWidth';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_METHODS, BadgeCard } from './collection';
import { FadeIn, Pop, PressScale } from './motion';
import { PillButton } from './ui';
import { MethodGlyph } from './Glyph';
import { PALATE_TYPES } from '../config/scoring.config';
import { tr } from '../i18n/tr';
import { badgeProgress, passport } from '../lib/progress';
import { useEntries } from '../lib/useEntries';
import { colors, fonts, tint, type } from '../theme';
import type { Method } from '../lib/types';
import { useTabBarSpace, useTabScrollRef } from './TabBar';

/** Damak Pasaportu sekmesinin içeriği (Profil > Koleksiyon'un ayrı sayfaları components/collection.tsx'i kullanır). */
export function PassportView({ header }: { header: ReactNode }) {
  const insets = useSafeAreaInsets();
  const pagePad = usePagePad(); // tablette içerik ortada, kaydırma her yerden
  const tabSpace = useTabBarSpace();
  const scrollRef = useTabScrollRef();
  const loadedEntries = useEntries();
  const loaded = loadedEntries !== null;
  const entries = loadedEntries ?? [];
  const p = passport(entries);
  const cupsBy: Partial<Record<Method, number>> = {};
  for (const e of entries) cupsBy[e.method] = (cupsBy[e.method] ?? 0) + 1;
  // En çok içilen yöntem kehribar mürekkeple öne çıkar; diğerleri tek renk
  const topMethod = ALL_METHODS.reduce<Method | null>((best, m) => ((cupsBy[m] ?? 0) > (best ? (cupsBy[best] ?? 0) : 0) ? m : best), null);

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20 + pagePad, paddingBottom: tabSpace }}
    >
      {header}
      <Text style={styles.summary}>{tr.passport.summary(p.places.length, p.methods.length)}</Text>
      {/* Boş pasaport: ne yapılacağı belli olsun */}
      {loaded && entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{tr.passport.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{tr.passport.emptyBody}</Text>
          <PillButton label={tr.passport.emptyCta} onPress={() => router.push('/new')} style={{ marginTop: 14, height: 48 }} />
        </View>
      ) : null}

      {/* Pasaport sayfası: mürekkep damgaları (bakmak için; dokunulmaz) */}
      <Text accessibilityRole="header" style={styles.section}>{tr.passport.methods}</Text>
      <View style={styles.page}>
        <View style={styles.stampRow}>
          {ALL_METHODS.map((m, i) => (
            <MethodStamp key={m} method={m} cups={cupsBy[m] ?? 0} index={i} top={m === topMethod} />
          ))}
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.section}>{tr.passport.types}</Text>
      <View style={styles.page}>
        <View style={styles.visaRow}>
          {PALATE_TYPES.map((t, i) => (
            <VisaStamp key={t.id} label={t.name} earned={p.palateTypeIds.includes(t.id)} index={i} />
          ))}
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.section}>{tr.passport.badges}</Text>
      {/* Kazanılan rozetler en üstte; kalanlar kendi sırasında */}
      {[...badgeProgress(entries)].sort((a, b) => Number(b.earned) - Number(a.earned)).map((bp, i) => (
        <FadeIn key={bp.badge.id} index={i}>
          <BadgeCard progress={bp} />
        </FadeIn>
      ))}

      <Text accessibilityRole="header" style={styles.section}>{tr.passport.places}</Text>
      {p.places.length === 0 ? <Text style={styles.empty}>{tr.passport.noPlaces}</Text> : null}
      <View style={styles.stamps}>
        {p.places.map((pl, i) => (
          <FadeIn key={pl.key} index={i} style={styles.placeWrap}>
          <PressScale
            style={[styles.placeStamp, i === 0 && styles.placeStampTop]}
            scaleTo={0.96}
            onPress={() => router.push({ pathname: '/history', params: { place: pl.key, title: pl.name } })}
          >
            <Text style={styles.placeName} numberOfLines={2}>
              {pl.name}
            </Text>
            <Text style={styles.placeMeta}>{tr.passport.visits(pl.visits)}</Text>
            <Text style={styles.placeMeta}>
              {new Date(pl.firstVisit).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </PressScale>
          </FadeIn>
        ))}
      </View>
    </ScrollView>
  );
}

const RING = 58;
/** Her damganın hafif farklı eğikliği (elle basılmış gibi; her açılışta aynı; en fazla ±3°). */
const STAMP_TILT = [-3, 2, -2, 3, -1];
const VISA_INK = [tint.cherry, colors.text, tint.sage, tint.amber];

/** Yöntem damgası: yuvarlak çift çizgili damga; içinde simge ve fincan sayısı. Kazanılmadıysa ince çizgili boş yer. */
function MethodStamp({ method, cups, index, top }: { method: Method; cups: number; index: number; top: boolean }) {
  const earned = cups > 0;
  const ink = top ? colors.accent : colors.text;
  const label = tr.methods[method];
  if (!earned) {
    return (
      <View style={styles.methodCell} accessible accessibilityLabel={`${label}, ${tr.passport.locked}`}>
        <View style={styles.methodRing}>
          <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
            <Circle cx={RING / 2} cy={RING / 2} r={RING / 2 - 1.5} stroke={colors.line} strokeWidth={1.5} fill="none" />
          </Svg>
          <MethodGlyph method={method} size={22} color={colors.tertiary} strokeWidth={1.75} />
        </View>
        <Text style={[styles.methodLabel, { color: colors.muted, fontWeight: '500' }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.methodCell} accessible accessibilityLabel={`${label}, ${tr.passport.cups(cups)}`}>
      <Pop delay={120 + index * 70}>
        {/* Çerçeve SVG ile çizilir: iPhone'da eğik/kenarlı kutular tırtıklı görünür, SVG çizgisi pürüzsüz kalır */}
        <View style={styles.methodRing}>
          <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
            <Circle cx={RING / 2} cy={RING / 2} r={RING / 2 - 1.5} stroke={ink} strokeWidth={1.75} fill="none" />
            <Circle cx={RING / 2} cy={RING / 2} r={RING / 2 - 5} stroke={ink} strokeWidth={0.75} fill="none" opacity={0.6} />
          </Svg>
          <View style={{ alignItems: 'center', transform: [{ rotate: `${STAMP_TILT[index % STAMP_TILT.length]}deg` }] }}>
            <MethodGlyph method={method} size={20} color={ink} strokeWidth={1.75} />
            <Text style={[styles.methodCount, { color: ink }]}>{cups}</Text>
          </View>
        </View>
      </Pop>
      <Text style={styles.methodLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Damak tipi "vizesi": dikdörtgen, çift çerçeveli, eğik damga. Kazanılmadıysa soluk kesik çizgili boş yer. */
function VisaStamp({ label, earned, index }: { label: string; earned: boolean; index: number }) {
  if (!earned) {
    return (
      <View style={[styles.visa, styles.visaEmpty]} accessible accessibilityLabel={`${label}, ${tr.passport.locked}`}>
        <Text style={styles.visaNameEmpty} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </Text>
      </View>
    );
  }
  return <EarnedVisa label={label} ink={VISA_INK[index % VISA_INK.length]} tilt={STAMP_TILT[index % STAMP_TILT.length]} index={index} />;
}

/** Kazanılmış vize: çift çerçeve SVG'de döndürülür (pürüzsüz), yazı da aynı açıyla. */
function EarnedVisa({ label, ink, tilt, index }: { label: string; ink: string; tilt: number; index: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const { w, h } = box;
  return (
    <Pop delay={200 + index * 60} style={styles.visaWrap}>
      <View
        style={styles.visa}
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        accessible
        accessibilityLabel={label}
      >
        {w ? (
          <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
            <G rotation={tilt} origin={`${w / 2}, ${h / 2}`}>
              <Rect x={5} y={5} width={w - 10} height={h - 10} rx={8} stroke={ink} strokeWidth={1.75} fill="none" />
              <Rect x={9} y={9} width={w - 18} height={h - 18} rx={5} stroke={ink} strokeWidth={0.75} fill="none" opacity={0.6} />
            </G>
          </Svg>
        ) : null}
        <View style={{ alignItems: 'center', transform: [{ rotate: `${tilt}deg` }] }}>
          <Text style={[styles.visaKicker, { color: ink }]}>{tr.passport.visa}</Text>
          <Text style={[styles.visaName, { color: ink }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {label}
          </Text>
        </View>
      </View>
    </Pop>
  );
}

const styles = StyleSheet.create({
  summary: { ...type.headline, color: colors.accentText, marginTop: 4 },
  section: { ...type.title2, marginTop: 28, marginBottom: 12 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Pasaport sayfası: kâğıt gibi sade kart
  page: { backgroundColor: colors.card, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 10 },
  stampRow: { flexDirection: 'row', justifyContent: 'space-between' },
  methodCell: { width: '20%', alignItems: 'center' },
  methodRing: { width: RING, height: RING, borderRadius: RING / 2, alignItems: 'center', justifyContent: 'center' },
  methodCount: { fontFamily: fonts.heavy, fontSize: 13, marginTop: 0 },
  methodLabel: { ...type.caption, fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 8, textAlign: 'center', paddingHorizontal: 2 },
  visaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 4 },
  visaWrap: { width: '47%' },
  visa: { width: '100%', minHeight: 66, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  // Kazanılmamış vize: ince düz çizgi, sönük ve normal kalınlıkta yazı (kazanılanlarla yarışmasın)
  visaEmpty: { width: '47%', minHeight: 66, borderRadius: 8, borderColor: colors.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  visaNameEmpty: { fontSize: 13, fontWeight: '500', color: colors.muted, textAlign: 'center' },
  visaKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  visaName: { fontFamily: fonts.display, fontSize: 14, textAlign: 'center', marginTop: 2 },
  emptyCard: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginTop: 16 },
  emptyTitle: { ...type.headline },
  emptyBody: { ...type.subhead, marginTop: 4 },
  empty: { ...type.subhead },
  placeWrap: { flexBasis: '46%', flexGrow: 1, maxWidth: '49%' },
  placeStamp: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  placeStampTop: { borderWidth: 1.5, borderColor: colors.accent },
  placeName: { ...type.headline, fontSize: 15 },
  placeMeta: { ...type.caption, marginTop: 2 },
});
