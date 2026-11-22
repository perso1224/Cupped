import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_METHODS, BadgeCard } from './collection';
import { FadeIn, PressScale } from './motion';
import { PALATE_TYPES } from '../config/scoring.config';
import { tr } from '../i18n/tr';
import { badgeProgress, passport } from '../lib/progress';
import { useEntries } from '../lib/useEntries';
import { colors, type } from '../theme';
import { useTabBarSpace } from './TabBar';

/** Damak Pasaportu sekmesinin içeriği (Profil > Koleksiyon'un ayrı sayfaları components/collection.tsx'i kullanır). */
export function PassportView({ header }: { header: ReactNode }) {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const entries = useEntries() ?? [];
  const p = passport(entries);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: tabSpace }}
    >
      {header}
      <Text style={styles.summary}>{tr.passport.summary(p.places.length, p.methods.length)}</Text>

      <Text style={styles.section}>{tr.passport.methods}</Text>
      <View style={styles.stamps}>
        {ALL_METHODS.map((m) => (
          <Stamp
            key={m}
            label={tr.methods[m]}
            earned={p.methods.includes(m)}
            onPress={p.methods.includes(m) ? () => router.push({ pathname: '/history', params: { method: m } }) : undefined}
          />
        ))}
      </View>

      <Text style={styles.section}>{tr.passport.types}</Text>
      <View style={styles.stamps}>
        {PALATE_TYPES.map((t) => (
          <Stamp key={t.id} label={t.name} earned={p.palateTypeIds.includes(t.id)} />
        ))}
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

function Stamp({ label, earned, onPress }: { label: string; earned: boolean; onPress?: () => void }) {
  const style = [styles.stamp, earned ? styles.stampOn : styles.stampOff];
  const text = (
    <Text style={[styles.stampText, earned && { color: colors.white }]} numberOfLines={2}>
      {label}
    </Text>
  );
  if (!onPress) return <View style={style}>{text}</View>;
  return (
    <PressScale style={style} scaleTo={0.95} onPress={onPress}>
      {text}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  summary: { ...type.headline, color: colors.accentText, marginTop: 4 },
  section: { ...type.title2, marginTop: 28, marginBottom: 12 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stamp: {
    flexBasis: '30%',
    flexGrow: 1,
    maxWidth: '32%',
    minHeight: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 2,
  },
  stampOn: { backgroundColor: colors.black, borderColor: colors.black },
  stampOff: { backgroundColor: 'transparent', borderColor: colors.line, borderStyle: 'dashed' },
  stampText: { ...type.footnote, fontWeight: '600', textAlign: 'center' },
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
