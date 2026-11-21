import { Fragment, useMemo } from 'react';
import { BackButton } from '../components/NavButtons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../components/CupRow';
import { FadeIn } from '../components/motion';
import { tr, upper } from '../i18n/tr';
import { useEntries } from '../lib/useEntries';
import type { CupEntry } from '../lib/types';
import { colors, layout, radius, type } from '../theme';

function groupByDay(list: CupEntry[]) {
  const groups: { label: string; items: CupEntry[] }[] = [];
  for (const e of list) {
    const label = new Date(e.createdAt).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
  const groups = useMemo(() => groupByDay(entries ?? []), [entries]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + layout.topPad, paddingHorizontal: layout.screenPad, paddingBottom: 40 }}
    >
      <BackButton label={tr.settings.back} />
      <Text style={styles.title}>{tr.history.title}</Text>
      {entries && list.length === 0 ? <Text style={styles.empty}>{tr.history.empty}</Text> : null}
      {groups.map((g, gi) => (
        <FadeIn key={g.label} index={gi}>
          <Text style={styles.day}>{upper(g.label)}</Text>
          <View style={styles.group}>
            {g.items.map((e, i) => (
              <Fragment key={e.id}>
                {i > 0 ? <View style={styles.separator} /> : null}
                <CupRow entry={e} timeOnly showParts plain />
              </Fragment>
            ))}
          </View>
        </FadeIn>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { ...type.largeTitle },
  day: { ...type.sectionHeader, marginTop: 22, marginBottom: 6, marginLeft: 4 },
  group: { backgroundColor: colors.card, borderRadius: radius.group, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 92 },
  empty: { ...type.subhead, marginTop: 24, textAlign: 'center' },
});
