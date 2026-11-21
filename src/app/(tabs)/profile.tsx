import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, PillButton } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { getPalateType } from '../../lib/palate';
import { profileSummary } from '../../lib/progress';
import { levelFor } from '../../lib/scoring';
import { loadCounters, type Counters } from '../../lib/storage';
import { useEntries } from '../../lib/useEntries';
import { colors } from '../../theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const entries = useEntries() ?? [];
  const [counters, setCounters] = useState<Counters>({ cardsGenerated: 0, shares: 0 });
  useFocusEffect(
    useCallback(() => {
      loadCounters().then(setCounters);
    }, []),
  );

  const { avg, places, methods, palateTypeId } = profileSummary(entries);
  const type = palateTypeId ? getPalateType(palateTypeId) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}>
      <Text style={styles.title}>{tr.profile.title}</Text>

      <PillButton label={tr.profile.showCard} onPress={() => router.push('/card')} style={{ marginBottom: 16 }} />

      {type ? (
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.label}>{tr.home.palateType}</Text>
          <Text style={styles.typeName}>{type.name}</Text>
          <Text style={styles.tagline}>{type.tagline}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>
            {tr.result.level}: {levelFor(avg)}
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.label}>{tr.profile.stats}</Text>
        <View style={styles.grid}>
          <Stat value={entries.length} label={tr.profile.cups} />
          <Stat value={avg} label={tr.profile.avg} />
          <Stat value={places} label={tr.profile.places} />
          <Stat value={methods} label={tr.profile.methods} />
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.label}>{tr.profile.measurement}</Text>
        <View style={styles.grid}>
          <Stat value={counters.cardsGenerated} label={tr.profile.cardsMade} />
          <Stat value={counters.shares} label={tr.profile.shares} />
        </View>
      </Card>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted },
  typeName: { fontSize: 26, fontWeight: '900', color: colors.text, marginTop: 4 },
  tagline: { fontSize: 15, color: colors.muted, marginTop: 6, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  stat: { width: '50%', paddingVertical: 10 },
  statValue: { fontSize: 32, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted },
});
