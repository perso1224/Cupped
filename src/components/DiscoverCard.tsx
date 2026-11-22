import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { DiscoverItem, DiscoverKind } from '../content/discover';
import { tr, upper } from '../i18n/tr';
import { colors, fonts, isDark, tint, type } from '../theme';
import { Icon, type IconName } from './Icon';
import { haptic, PressScale } from './motion';
import { PillButton } from './ui';

const KIND: Record<DiscoverKind, { icon: IconName; color: string }> = {
  bean: { icon: 'leaf', color: tint.sage },
  term: { icon: 'book', color: tint.sky },
  tip: { icon: 'flask', color: tint.amber },
  fact: { icon: 'bulb', color: tint.cherry },
};

/** Keşfet maddesi. compact: ana sayfadaki kısa hali (dokununca Keşfet açılır). */
export function DiscoverCard({ item, compact, today }: { item: DiscoverItem; compact?: boolean; today?: boolean }) {
  const k = KIND[item.kind];
  const body = (
    <View style={[styles.card, today && !compact && styles.todayCard]}>
      <View style={styles.head}>
        <View style={[styles.chip, { backgroundColor: k.color }]}>
          <Icon name={k.icon} size={12} color={colors.onColor} />
          <Text style={styles.chipText}>{upper(tr.discover.kinds[item.kind])}</Text>
        </View>
        {today ? <Text style={styles.today}>{tr.discover.today}</Text> : null}
      </View>
      <Text style={[styles.title, compact && { fontSize: 20 }]}>{item.title}</Text>
      <Text style={styles.body} numberOfLines={compact ? 2 : undefined}>
        {item.body}
      </Text>
      {compact ? (
        <View style={styles.more}>
          <Text style={styles.moreText}>{tr.discover.open}</Text>
          <Icon name="chevron-forward" size={16} color={colors.accentText} />
        </View>
      ) : item.action === 'addCup' ? (
        <PillButton label={tr.discover.tryIt} variant="light" icon="add" onPress={() => router.push('/new')} style={{ marginTop: 14, height: 46 }} />
      ) : null}
    </View>
  );
  if (!compact) return body;
  return (
    <PressScale
      onPress={() => {
        haptic.light();
        router.push('/discover');
      }}
      scaleTo={0.98}
      accessibilityLabel={`${tr.discover.title}: ${item.title}`}
    >
      {body}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#2B1A12',
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: isDark ? 0 : 2,
  },
  todayCard: { borderWidth: 1.5, borderColor: colors.accent },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { color: colors.onColor, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  today: { ...type.caption, color: colors.accentText, fontWeight: '700' },
  title: { fontSize: 24, fontFamily: fonts.display, color: colors.text, marginTop: 12 },
  body: { ...type.subhead, color: colors.text, marginTop: 6, lineHeight: 22 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10 },
  moreText: { fontSize: 14, fontWeight: '700', color: colors.accentText },
});
