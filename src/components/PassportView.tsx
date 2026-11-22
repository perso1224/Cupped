import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_METHODS, BadgeCard } from './collection';
import { FadeIn, Pop, PressScale } from './motion';
import { Icon, type IconName } from './Icon';
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
  const tabSpace = useTabBarSpace();
  const scrollRef = useTabScrollRef();
  const entries = useEntries() ?? [];
  const p = passport(entries);
  const cupsBy: Partial<Record<Method, number>> = {};
  for (const e of entries) cupsBy[e.method] = (cupsBy[e.method] ?? 0) + 1;

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: tabSpace }}
    >
      {header}
      <Text style={styles.summary}>{tr.passport.summary(p.places.length, p.methods.length)}</Text>

      {/* Pasaport sayfası: mürekkep damgaları (bakmak için; dokunulmaz) */}
      <Text style={styles.section}>{tr.passport.methods}</Text>
      <View style={styles.page}>
        <View style={styles.stampRow}>
          {ALL_METHODS.map((m, i) => (
            <MethodStamp key={m} method={m} cups={cupsBy[m] ?? 0} index={i} />
          ))}
        </View>
      </View>

      <Text style={styles.section}>{tr.passport.types}</Text>
      <View style={styles.page}>
        <View style={styles.visaRow}>
          {PALATE_TYPES.map((t, i) => (
            <VisaStamp key={t.id} label={t.name} earned={p.palateTypeIds.includes(t.id)} index={i} />
          ))}
        </View>
      </View>

      <Text style={styles.section}>{tr.passport.badges}</Text>
      {badgeProgress(entries).map((bp, i) => (
        <FadeIn key={bp.badge.id} index={i}>
          <BadgeCard progress={bp} />
        </FadeIn>
      ))}

      <Text style={styles.section}>{tr.passport.places}</Text>
      {p.places.length === 0 ? <Text style={styles.empty}>{tr.passport.noPlaces}</Text> : null}
      <View style={styles.stamps}>
        {p.places.map((pl, i) => (
          <FadeIn key={pl.key} index={i} style={styles.placeWrap}>
          <PressScale
            style={styles.placeStamp}
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

/** Her damganın hafif farklı eğikliği (elle basılmış gibi; her açılışta aynı). */
const TILT = [-8, 5, -3, 7, -5, 4, -7, 3, -4, 6, -2, 8, -6];
const METHOD_INK: Record<Method, string> = {
  espresso: tint.espresso,
  filter: tint.amber,
  coldbrew: tint.sky,
  milk: tint.slate,
  turkish: tint.cherry,
};
const METHOD_ICON: Record<Method, IconName> = {
  espresso: 'cafe',
  filter: 'funnel',
  coldbrew: 'snow',
  milk: 'water',
  turkish: 'flame',
};
const VISA_INK = [tint.cherry, tint.espresso, tint.sage, tint.amber, tint.sky, tint.slate];

/** Yöntem damgası: yuvarlak, çift çizgili mürekkep damga; içinde simge ve fincan sayısı. Kazanılmadıysa soluk boş yer. */
function MethodStamp({ method, cups, index }: { method: Method; cups: number; index: number }) {
  const earned = cups > 0;
  const ink = METHOD_INK[method];
  const label = tr.methods[method];
  if (!earned) {
    return (
      <View style={styles.methodCell} accessible accessibilityLabel={`${label}, ${tr.passport.locked}`}>
        <View style={[styles.methodRing, styles.emptyRing]}>
          <Icon name={METHOD_ICON[method]} size={22} color={colors.line} />
        </View>
        <Text style={[styles.methodLabel, { color: colors.tertiary }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.methodCell} accessible accessibilityLabel={`${label}, ${tr.passport.cups(cups)}`}>
      <Pop delay={120 + index * 70}>
        <View style={[styles.methodRing, { borderColor: ink, transform: [{ rotate: `${TILT[index % TILT.length]}deg` }] }]}>
          <View style={[styles.methodInner, { borderColor: ink }]}>
            <Icon name={METHOD_ICON[method]} size={22} color={ink} />
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
        <Text style={[styles.visaName, { color: colors.tertiary }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    );
  }
  const ink = VISA_INK[index % VISA_INK.length];
  return (
    <Pop delay={200 + index * 60} style={styles.visaWrap}>
      <View
        style={[styles.visa, { borderColor: ink, transform: [{ rotate: `${TILT[(index + 3) % TILT.length] / 2}deg` }] }]}
        accessible
        accessibilityLabel={label}
      >
        <View style={[styles.visaInner, { borderColor: ink }]}>
          <Text style={[styles.visaKicker, { color: ink }]}>{tr.passport.visa}</Text>
          <Text style={[styles.visaName, { color: ink }]} numberOfLines={2}>
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
  stampRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 14 },
  methodCell: { width: '33.33%', alignItems: 'center' },
  methodRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, padding: 3, alignItems: 'center', justifyContent: 'center' },
  methodInner: { flex: 1, alignSelf: 'stretch', borderRadius: 33, borderWidth: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  emptyRing: { borderColor: colors.line, borderStyle: 'dashed', borderWidth: 1.5 },
  methodCount: { fontFamily: fonts.heavy, fontSize: 15, marginTop: 1 },
  methodLabel: { ...type.caption, fontWeight: '700', color: colors.text, marginTop: 8, textAlign: 'center', paddingHorizontal: 4 },
  visaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 4 },
  visaWrap: { width: '47%' },
  visa: { width: '100%', minHeight: 62, borderRadius: 8, borderWidth: 2, padding: 3 },
  visaEmpty: { width: '47%', borderColor: colors.line, borderStyle: 'dashed', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', padding: 8 },
  visaInner: { flex: 1, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 6 },
  visaKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  visaName: { fontFamily: fonts.display, fontSize: 14, textAlign: 'center', marginTop: 2 },
  empty: { ...type.subhead },
  placeWrap: { flexBasis: '46%', flexGrow: 1, maxWidth: '49%' },
  placeStamp: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  placeName: { ...type.headline, fontSize: 15 },
  placeMeta: { ...type.caption, marginTop: 2 },
});
