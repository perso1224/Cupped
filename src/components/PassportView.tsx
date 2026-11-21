import { useRef, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { FadeIn } from './motion';
import { Card } from './ui';
import { PALATE_TYPES } from '../config/scoring.config';
import { tr } from '../i18n/tr';
import { badgeProgress, passport } from '../lib/progress';
import type { Method } from '../lib/types';
import { useEntries } from '../lib/useEntries';
import { colors, type } from '../theme';

const ALL_METHODS: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];

export type PassportFocus = 'methods' | 'types' | 'badges' | 'places';

/**
 * Damak Pasaportu içeriği. Hem Pasaport sekmesinde hem Profil'den açılan Koleksiyon ekranında kullanılır.
 * focus verilirse açılışta o bölüme kaydırır.
 */
export function PassportView({ header, focus }: { header: ReactNode; focus?: PassportFocus }) {
  const insets = useSafeAreaInsets();
  const entries = useEntries() ?? [];
  const p = passport(entries);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);
  function handleSectionLayout(key: PassportFocus, layoutY: number) {
    if (focus !== key || scrolled.current) return;
    scrolled.current = true;
    const y = Math.max(0, layoutY - 12);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }));
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 48 }}
    >
      {header}
      <Text style={styles.summary}>{tr.passport.summary(p.places.length, p.methods.length)}</Text>

      <Text style={styles.section} onLayout={(e) => handleSectionLayout('methods', e.nativeEvent.layout.y)}>{tr.passport.methods}</Text>
      <View style={styles.stamps}>
        {ALL_METHODS.map((m) => (
          <Stamp key={m} label={tr.methods[m]} earned={p.methods.includes(m)} />
        ))}
      </View>

      <Text style={styles.section} onLayout={(e) => handleSectionLayout('types', e.nativeEvent.layout.y)}>{tr.passport.types}</Text>
      <View style={styles.stamps}>
        {PALATE_TYPES.map((t) => (
          <Stamp key={t.id} label={t.name} earned={p.palateTypeIds.includes(t.id)} />
        ))}
      </View>

      <Text style={styles.section} onLayout={(e) => handleSectionLayout('badges', e.nativeEvent.layout.y)}>{tr.passport.badges}</Text>
      {badgeProgress(entries).map(({ badge: b, current, target, earned }, i) => (
        <FadeIn key={b.id} index={i}>
        <Card style={styles.badge}>
          <View style={[styles.badgeIcon, { backgroundColor: earned ? colors.accent : colors.line }]}>
            <Icon name={earned ? 'ribbon' : 'lock-closed'} size={18} color={earned ? colors.white : colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.badgeName, !earned && { color: colors.muted }]}>{b.name}</Text>
            <Text style={styles.badgeDesc}>{earned ? b.description : b.howTo}</Text>
            {!earned && target > 1 ? (
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${(current / target) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {current}/{target}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>
        </FadeIn>
      ))}

      <Text style={styles.section} onLayout={(e) => handleSectionLayout('places', e.nativeEvent.layout.y)}>{tr.passport.places}</Text>
      {p.places.length === 0 ? <Text style={styles.empty}>{tr.passport.noPlaces}</Text> : null}
      <View style={styles.stamps}>
        {p.places.map((pl, i) => (
          <FadeIn key={pl.name} index={i} style={styles.placeWrap}>
          <View style={styles.placeStamp}>
            <Text style={styles.placeName} numberOfLines={2}>
              {pl.name}
            </Text>
            <Text style={styles.placeMeta}>{tr.passport.visits(pl.visits)}</Text>
            <Text style={styles.placeMeta}>
              {new Date(pl.firstVisit).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          </FadeIn>
        ))}
      </View>
    </ScrollView>
  );
}

function Stamp({ label, earned }: { label: string; earned: boolean }) {
  return (
    <View style={[styles.stamp, earned ? styles.stampOn : styles.stampOff]}>
      <Text style={[styles.stampText, earned && { color: colors.white }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
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
  badge: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 },
  badgeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  badgeName: { ...type.headline },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginRight: 8 },
  progressFill: { height: 6, backgroundColor: colors.accent },
  progressText: { ...type.caption, fontWeight: '700' },
  badgeDesc: { ...type.footnote, marginTop: 2 },
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
