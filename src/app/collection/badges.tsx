import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BadgeCard, CollectionScreen, ProgressBar } from '../../components/collection';
import { FadeIn } from '../../components/motion';
import { tr } from '../../i18n/tr';
import { badgeProgress } from '../../lib/progress';
import { useEntries } from '../../lib/useEntries';
import { type } from '../../theme';

/** Profil > Koleksiyon > Rozetler: kazanılanlar üstte, sıradakiler en yakın olandan başlayarak. */
export default function Badges() {
  const entries = useEntries();
  const all = useMemo(() => badgeProgress(entries ?? []), [entries]);
  const earned = all.filter((b) => b.earned);
  const next = all.filter((b) => !b.earned).sort((a, b) => b.current / b.target - a.current / a.target);

  return (
    <CollectionScreen title={tr.profile.badges} summary={entries ? tr.collection.badgesSummary(earned.length, all.length) : undefined}>
      {entries ? (
        <View style={styles.bar}>
          <ProgressBar value={all.length ? earned.length / all.length : 0} height={8} />
        </View>
      ) : null}

      <Text accessibilityRole="header" style={styles.section}>{tr.collection.earned}</Text>
      {entries && earned.length === 0 ? <Text style={styles.empty}>{tr.collection.noBadges}</Text> : null}
      {earned.map((bp, i) => (
        <FadeIn key={bp.badge.id} index={i}>
          <BadgeCard progress={bp} />
        </FadeIn>
      ))}

      {next.length ? <Text accessibilityRole="header" style={styles.section}>{tr.collection.next}</Text> : null}
      {next.map((bp, i) => (
        <FadeIn key={bp.badge.id} index={earned.length + i}>
          <BadgeCard progress={bp} />
        </FadeIn>
      ))}
    </CollectionScreen>
  );
}

const styles = StyleSheet.create({
  bar: { marginTop: 14 },
  section: { ...type.title2, marginTop: 28, marginBottom: 12 },
  empty: { ...type.subhead, marginBottom: 4 },
});
