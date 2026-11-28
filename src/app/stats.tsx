import { Redirect } from 'expo-router';
import { usePagePad } from '../lib/contentWidth';
import { BackSpacer, FloatingBack } from '../components/NavButtons';
import { IS_STORE_BUILD } from '../lib/build';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListRow, ListSection } from '../components/List';
import { tr } from '../i18n/tr';
import { computeStats } from '../lib/metrics';
import { clearProfile } from '../lib/storage';
import { useEntries } from '../lib/useEntries';
import { useMetrics } from '../lib/useMetrics';
import { useProfile } from '../lib/useProfile';
import { colors, layout, tint, type } from '../theme';

const pct = (x: number | null) => (x === null ? tr.stats.none : `%${Math.round(x * 100)}`);
const yn = (b: boolean) => (b ? tr.stats.yes : tr.stats.no);

/** Beta testi için hipotez sayıları (H2, H3, H4, H6). Kullanıcı ekran görüntüsü alıp kurucuya gönderir. */
/** Mağaza sürümünde bu deneme ekranı yok (bağlantıyla açılsa bile ana sayfaya döner). */
export default function Stats() {
  return IS_STORE_BUILD ? <Redirect href="/" /> : <StatsScreen />;
}

function StatsScreen() {
  const insets = useSafeAreaInsets();
  const pagePad = usePagePad(); // tablette içerik ortada, kaydırma her yerden
  const entries = useEntries() ?? [];
  const [metrics] = useMetrics();
  const profile = useProfile();

  function redo() {
    const run = async () => {
      // Profil silinince gezinme kendiliğinden tanıtıma geçer (_layout: Stack.Protected)
      await clearProfile();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(tr.stats.redoConfirm)) run();
      return;
    }
    Alert.alert(tr.stats.redoConfirm, undefined, [
      { text: tr.stats.cancel, style: 'cancel' },
      { text: tr.stats.ok, onPress: run },
    ]);
  }

  if (!metrics) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const s = computeStats(metrics, entries, profile?.onboardedAt ?? null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + layout.topPad, paddingHorizontal: layout.screenPad + pagePad, paddingBottom: 40 }}>
      <BackSpacer />
      <Text accessibilityRole="header" style={styles.title}>{tr.stats.title}</Text>
      <Text style={styles.intro}>{tr.stats.intro}</Text>

      <ListSection title={tr.stats.h2}>
        <ListRow icon="share-social" tint={tint.amber} title={tr.stats.shareRate} subtitle={tr.stats.cupsShared(s.cupsShared, s.cups)} value={pct(s.shareRate)} />
        <ListRow title={tr.stats.shareTaps} value={String(s.shareTaps)} />
        <ListRow title={tr.stats.sharesDone} value={String(s.sharesCompleted)} />
        {s.topApps.length ? <ListRow title={tr.stats.apps} subtitle={s.topApps.map(([a, n]) => `${a} ${n}`).join(' · ')} /> : null}
      </ListSection>

      <ListSection title={tr.stats.h3}>
        <ListRow icon="timer" tint={tint.sky} title={tr.stats.median} value={s.medianCaptureSec === null ? tr.stats.none : `${String(s.medianCaptureSec).replace('.', ',')} sn`} />
        <ListRow title={tr.stats.under10} value={pct(s.under10sRate)} />
        <ListRow title={tr.stats.abandon} value={pct(s.abandonRate)} />
      </ListSection>

      <ListSection title={tr.stats.h4}>
        <ListRow icon="repeat" tint={tint.sage} title={tr.stats.days} value={s.daysSinceInstall === null ? tr.stats.none : String(s.daysSinceInstall)} />
        <ListRow title={tr.stats.activeDays} value={String(s.activeDayCount)} />
        <ListRow title={tr.stats.d1} value={yn(s.returnedD1)} />
        <ListRow title={tr.stats.d7} value={yn(s.returnedD7)} />
        <ListRow title={tr.stats.d30} value={yn(s.returnedD30)} />
      </ListSection>

      <ListSection title={tr.stats.h6}>
        <ListRow icon="sparkles" tint={tint.espresso} title={tr.stats.clubViews} value={String(s.clubViews)} />
        <ListRow title={tr.stats.clubInterested} value={yn(s.clubInterested)} />
      </ListSection>

      <ListSection>
        <ListRow title={tr.stats.redo} destructive onPress={redo} />
      </ListSection>
    </ScrollView>
    <FloatingBack label={tr.settings.title} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.largeTitle },
  intro: { ...type.footnote, lineHeight: 19, marginTop: 8 },
});
