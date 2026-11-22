import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscoverCard } from '../components/DiscoverCard';
import { FadeIn } from '../components/motion';
import { BackButton } from '../components/NavButtons';
import { discoverFeed } from '../content/discover';
import { tr } from '../i18n/tr';
import { colors, layout, type } from '../theme';

/** Keşfet (DENEME): bugünün içeriği büyük, altında önceki günler. Herkeste aynı gün aynı içerik. */
export default function Discover() {
  const insets = useSafeAreaInsets();
  const [today, ...past] = discoverFeed(new Date(), 7);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + layout.topPad, paddingHorizontal: layout.screenPad, paddingBottom: insets.bottom + 40 }}
    >
      <BackButton label={tr.tabs.home} />
      <Text style={styles.title}>{tr.discover.title}</Text>
      <Text style={styles.sub}>{tr.discover.subtitle}</Text>
      <FadeIn index={0}>
        <DiscoverCard item={today} today />
      </FadeIn>
      <Text style={styles.section}>{tr.discover.earlier}</Text>
      {past.map((item, i) => (
        <FadeIn key={item.id} index={i + 1}>
          <DiscoverCard item={item} />
          <View style={{ height: 12 }} />
        </FadeIn>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { ...type.largeTitle, marginTop: 6 },
  sub: { ...type.subhead, marginTop: 2, marginBottom: 18 },
  section: { ...type.title2, marginTop: 28, marginBottom: 12 },
});
