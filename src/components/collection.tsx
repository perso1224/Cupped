import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../i18n/tr';
import type { BadgeProgress } from '../lib/progress';
import type { Method } from '../lib/types';
import { colors, layout, type } from '../theme';
import { Icon } from './Icon';
import { BackButton } from './NavButtons';
import { Card } from './ui';

export const ALL_METHODS: readonly Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];

/**
 * Profil > Koleksiyon altındaki sayfaların ortak iskeleti.
 * Geri düğmesi kaydırılan alanın DIŞINDA, sabit üst çubukta durur (iPhone'da kaydırma içinde uzayıp başlığı itiyordu).
 */
export function CollectionScreen({ title, summary, children }: { title: string; summary?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + layout.topPad }]}>
        <BackButton label={tr.profile.title} />
      </View>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingHorizontal: layout.screenPad, paddingBottom: insets.bottom + 48 }}>
        <Text style={styles.title}>{title}</Text>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

/** İlerleme çubuğu (0–1). */
export function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${pct}%`, height }]} />
    </View>
  );
}

/** Tek rozet kartı: kazanıldıysa açıklama, kilitliyse nasıl kazanılacağı ve ilerleme. */
export function BadgeCard({ progress: { badge: b, current, target, earned } }: { progress: BadgeProgress }) {
  return (
    <Card style={styles.badge}>
      <View style={[styles.badgeIcon, { backgroundColor: earned ? colors.accent : colors.line }]}>
        <Icon name={earned ? 'ribbon' : 'lock-closed'} size={18} color={earned ? colors.onColor : colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.badgeName, !earned && { color: colors.muted }]}>{b.name}</Text>
        <Text style={styles.badgeDesc}>{earned ? b.description : b.howTo}</Text>
        {!earned && target > 1 ? (
          <View style={styles.progressRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <ProgressBar value={current / target} />
            </View>
            <Text style={styles.progressText}>
              {current}/{target}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { paddingHorizontal: layout.screenPad, paddingBottom: 4, backgroundColor: colors.bg, alignItems: 'flex-start' },
  title: { ...type.largeTitle, marginTop: 2 },
  summary: { ...type.headline, color: colors.accentText, marginTop: 4 },
  track: { backgroundColor: colors.line, overflow: 'hidden' },
  fill: { backgroundColor: colors.accent },
  badge: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 },
  badgeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  badgeName: { ...type.headline },
  badgeDesc: { ...type.footnote, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressText: { ...type.caption, fontWeight: '700' },
});
