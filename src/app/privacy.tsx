import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { tr } from '../i18n/tr';
import { colors, type } from '../theme';

/** Gizlilik: verilerin nerede tutulduğunu sade bir dille anlatır. */
export default function Privacy() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
    >
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Icon name="chevron-back" size={24} color={colors.accent} />
        <Text style={styles.backText}>{tr.settings.title}</Text>
      </Pressable>
      <Text style={styles.title}>{tr.privacy.title}</Text>
      {tr.privacy.items.map(([h, b]) => (
        <Text key={h} style={styles.p}>
          <Text style={styles.h}>{h} </Text>
          {b}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6 },
  backText: { fontSize: 17, color: colors.accent },
  title: { ...type.largeTitle, marginTop: 6, marginBottom: 12 },
  p: { ...type.body, lineHeight: 25, marginTop: 14 },
  h: { fontWeight: '700' },
});
