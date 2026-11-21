import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../components/CupRow';
import { tr } from '../i18n/tr';
import { useEntries } from '../lib/useEntries';
import type { CupEntry } from '../lib/types';
import { colors } from '../theme';

function groupByDay(list: CupEntry[]) {
  const groups: { label: string; items: CupEntry[] }[] = [];
  for (const e of list) {
    const label = new Date(e.createdAt).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }
  return groups;
}

export default function History() {
  const insets = useSafeAreaInsets();
  const entries = useEntries();
  const list = entries ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{tr.history.title}</Text>
      </View>
      {entries && list.length === 0 ? <Text style={styles.empty}>{tr.history.empty}</Text> : null}
      {groupByDay(list).map((g) => (
        <View key={g.label}>
          <Text style={styles.day}>{g.label}</Text>
          {g.items.map((e) => (
            <CupRow key={e.id} entry={e} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { fontSize: 40, fontWeight: '300', color: colors.text, marginRight: 12, marginTop: -6 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  day: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 16, marginBottom: 8, textTransform: 'capitalize' },
  empty: { fontSize: 15, color: colors.muted, marginTop: 16 },
});
