import { useLocalSearchParams } from 'expo-router';
import { Fragment, useMemo } from 'react';
import { BackButton } from '../components/NavButtons';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../components/CupRow';
import { FadeIn, useAnimatedRemovals } from '../components/motion';
import { EmptyState } from '../components/EmptyState';
import { tr, upper } from '../i18n/tr';
import { useEntries } from '../lib/useEntries';
import { filterEntries } from '../lib/progress';
import type { CupEntry, Method } from '../lib/types';
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
  // ?place=<mekan anahtarı>&title=<ad> ya da ?method=<yöntem>: Pasaport'tan gelen filtre
  const { place, method, title } = useLocalSearchParams<{ place?: string; method?: Method; title?: string }>();
  // Silinen fincan geri dönünce listeden kayarak çıkar
  const all = useAnimatedRemovals(useEntries());
  const filtered = !!(place || method);
  const entries = useMemo(() => (all && filtered ? filterEntries(all, { place, method }) : all), [all, filtered, place, method]);
  const list = entries ?? [];
  const groups = useMemo(() => groupByDay(entries ?? []), [entries]);
  const heading = place ? (title ?? tr.history.title) : method ? (tr.methods[method] ?? tr.history.title) : tr.history.title;
  const avg = list.length ? Math.round(list.reduce((s, e) => s + e.score, 0) / list.length) : 0;

  return (
    // Uzun geçmişte sadece ekranda görünen günler çizilir (yüzlerce fincanda da akıcı kalsın)
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + layout.topPad, paddingHorizontal: layout.screenPad, paddingBottom: 40 }}
      data={groups}
      keyExtractor={(g) => g.label}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      ListHeaderComponent={
        <>
          <BackButton label={tr.settings.back} />
          <Text accessibilityRole="header" style={styles.title}>{heading}</Text>
          {filtered && list.length ? <Text style={styles.summary}>{tr.history.filterSummary(list.length, avg)}</Text> : null}
          {entries && list.length === 0 ? <EmptyState title={tr.history.empty} body={filtered ? undefined : tr.history.emptyBody} cta={!filtered} /> : null}
        </>
      }
      renderItem={({ item: g, index: gi }) => (
        <FadeIn index={gi < 8 ? gi : 0}>
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
      )}
    />
  );
}

const styles = StyleSheet.create({
  title: { ...type.largeTitle },
  day: { ...type.sectionHeader, marginTop: 22, marginBottom: 6, marginLeft: 4 },
  group: { backgroundColor: colors.card, borderRadius: radius.group, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 92 },
  empty: { ...type.subhead, marginTop: 24, textAlign: 'center' },
  summary: { ...type.headline, color: colors.accentText, marginTop: 4 },
});
