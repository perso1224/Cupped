import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeIn } from '../../components/motion';
import { Card } from '../../components/ui';
import { PALATE_TYPES } from '../../config/scoring.config';
import { tr } from '../../i18n/tr';
import { badgeProgress, passport } from '../../lib/progress';
import type { Method } from '../../lib/types';
import { useEntries } from '../../lib/useEntries';
import { colors } from '../../theme';

const ALL_METHODS: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];

export default function Passport() {
  const insets = useSafeAreaInsets();
  const entries = useEntries() ?? [];
  const p = passport(entries);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}
    >
      <Text style={styles.title}>{tr.passport.title}</Text>
      <Text style={styles.summary}>{tr.passport.summary(p.places.length, p.methods.length)}</Text>

      <Text style={styles.section}>{tr.passport.methods}</Text>
      <View style={styles.stamps}>
        {ALL_METHODS.map((m) => (
          <Stamp key={m} label={tr.methods[m]} earned={p.methods.includes(m)} />
        ))}
      </View>

      <Text style={styles.section}>{tr.passport.types}</Text>
      <View style={styles.stamps}>
        {PALATE_TYPES.map((t) => (
          <Stamp key={t.id} label={t.name} earned={p.palateTypeIds.includes(t.id)} />
        ))}
      </View>

      <Text style={styles.section}>{tr.passport.badges}</Text>
      {badgeProgress(entries).map(({ badge: b, current, target, earned }, i) => (
        <FadeIn key={b.id} index={i}>
        <Card style={styles.badge}>
          <Text style={[styles.badgeIcon, !earned && { opacity: 0.5 }]}>{earned ? '🏅' : '🔒'}</Text>
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

      <Text style={styles.section}>{tr.passport.places}</Text>
      {p.places.length === 0 ? <Text style={styles.empty}>{tr.passport.noPlaces}</Text> : null}
      <View style={styles.stamps}>
        {p.places.map((pl) => (
          <View key={pl.name} style={styles.placeStamp}>
            <Text style={styles.placeName} numberOfLines={2}>
              {pl.name}
            </Text>
            <Text style={styles.placeMeta}>{tr.passport.visits(pl.visits)}</Text>
            <Text style={styles.placeMeta}>
              {new Date(pl.firstVisit).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
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
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  summary: { fontSize: 17, fontWeight: '700', color: colors.accent, marginTop: 4 },
  section: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 28, marginBottom: 12 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  stamp: {
    width: '31%',
    margin: 4,
    minHeight: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 2,
  },
  stampOn: { backgroundColor: colors.black, borderColor: colors.black },
  stampOff: { backgroundColor: 'transparent', borderColor: colors.line, borderStyle: 'dashed' },
  stampText: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 },
  badgeIcon: { fontSize: 28, marginRight: 12 },
  badgeName: { fontSize: 16, fontWeight: '800', color: colors.text },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginRight: 8 },
  progressFill: { height: 6, backgroundColor: colors.accent },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  badgeDesc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { fontSize: 15, color: colors.muted },
  placeStamp: {
    width: '46%',
    flexGrow: 1,
    margin: 4,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  placeName: { fontSize: 15, fontWeight: '800', color: colors.text },
  placeMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
