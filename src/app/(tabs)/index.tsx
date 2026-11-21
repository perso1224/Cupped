import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { placeLabel } from '../../components/ShareCard';
import { ScoreRing } from '../../components/ScoreRing';
import { Card } from '../../components/ui';
import { BRAND } from '../../config/brand';
import { tr } from '../../i18n/tr';
import { computePalateTypeId, getPalateType } from '../../lib/palate';
import { levelFor } from '../../lib/scoring';
import { useEntries } from '../../lib/useEntries';
import type { CupEntry } from '../../lib/types';
import { colors } from '../../theme';

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const entries = useEntries();
  const list = entries ?? [];
  const todays = list.filter((e) => isToday(e.createdAt));
  const todayScore = todays.length ? Math.max(...todays.map((e) => e.score)) : 0;
  const type = list.length ? getPalateType(computePalateTypeId(list)) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}>
      <Text style={styles.brand}>{BRAND.name}</Text>

      <Card style={styles.todayCard}>
        <ScoreRing score={todayScore} size={150} caption={todays.length ? levelFor(todayScore) : undefined} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.cardLabel}>{tr.home.todayScore}</Text>
          {todays.length === 0 ? <Text style={styles.cardHint}>{tr.home.noCupToday}</Text> : null}
          {type ? (
            <>
              <Text style={[styles.cardLabel, { marginTop: 14 }]}>{tr.home.palateType}</Text>
              <Text style={styles.typeName}>{type.name}</Text>
            </>
          ) : null}
        </View>
      </Card>

      <Text style={styles.section}>{tr.home.recent}</Text>
      {entries && list.length === 0 ? <Text style={styles.empty}>{tr.home.empty}</Text> : null}
      {list.slice(0, 20).map((e) => (
        <CupRow key={e.id} entry={e} />
      ))}
    </ScrollView>
  );
}

function CupRow({ entry }: { entry: CupEntry }) {
  return (
    <Pressable onPress={() => router.push(`/cup/${entry.id}`)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      <Card style={styles.row}>
        {entry.photoUri ? (
          <Image source={{ uri: entry.photoUri }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={{ fontSize: 26 }}>☕</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {tr.methods[entry.method]}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {placeLabel(entry)}
          </Text>
          <Text style={styles.rowTime}>{timeLabel(entry.createdAt)}</Text>
        </View>
        <Text style={styles.rowScore}>{entry.score}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5, marginBottom: 16 },
  todayCard: { flexDirection: 'row', alignItems: 'center' },
  cardLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  cardHint: { fontSize: 15, color: colors.text, marginTop: 4 },
  typeName: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 },
  section: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 28, marginBottom: 12 },
  empty: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
  thumb: { width: 64, height: 64, borderRadius: 14 },
  thumbEmpty: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  rowTime: { fontSize: 12, color: colors.muted, marginTop: 4 },
  rowScore: { fontSize: 30, fontWeight: '900', color: colors.text, marginLeft: 8 },
});
