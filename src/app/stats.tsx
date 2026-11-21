import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/ui';
import { tr } from '../i18n/tr';
import { computeStats } from '../lib/metrics';
import { clearProfile } from '../lib/storage';
import { useEntries } from '../lib/useEntries';
import { useMetrics } from '../lib/useMetrics';
import { useProfile } from '../lib/useProfile';
import { colors } from '../theme';

const pct = (x: number | null) => (x === null ? tr.stats.none : `%${Math.round(x * 100)}`);
const yn = (b: boolean) => (b ? tr.stats.yes : tr.stats.no);

/** Beta testi için hipotez sayıları (H2, H3, H4, H6). Kullanıcı ekran görüntüsü alıp kurucuya gönderir. */
export default function Stats() {
  const insets = useSafeAreaInsets();
  const entries = useEntries() ?? [];
  const [metrics] = useMetrics();
  const profile = useProfile();

  function redo() {
    const run = async () => {
      await clearProfile();
      router.replace('/onboarding');
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{tr.stats.title}</Text>
      </View>
      <Text style={styles.intro}>{tr.stats.intro}</Text>

      <Section title={tr.stats.h2}>
        <Row label={tr.stats.shareRate} value={pct(s.shareRate)} sub={tr.stats.cupsShared(s.cupsShared, s.cups)} />
        <Row label={tr.stats.shareTaps} value={String(s.shareTaps)} />
        <Row label={tr.stats.sharesDone} value={String(s.sharesCompleted)} />
        {s.topApps.length ? <Row label={tr.stats.apps} value={s.topApps.map(([a, n]) => `${a} ${n}`).join(' · ')} small /> : null}
      </Section>

      <Section title={tr.stats.h3}>
        <Row label={tr.stats.median} value={s.medianCaptureSec === null ? tr.stats.none : `${String(s.medianCaptureSec).replace('.', ',')} sn`} />
        <Row label={tr.stats.under10} value={pct(s.under10sRate)} />
        <Row label={tr.stats.abandon} value={pct(s.abandonRate)} />
      </Section>

      <Section title={tr.stats.h4}>
        <Row label={tr.stats.days} value={s.daysSinceInstall === null ? tr.stats.none : String(s.daysSinceInstall)} />
        <Row label={tr.stats.activeDays} value={String(s.activeDayCount)} />
        <Row label={tr.stats.d1} value={yn(s.returnedD1)} />
        <Row label={tr.stats.d7} value={yn(s.returnedD7)} />
        <Row label={tr.stats.d30} value={yn(s.returnedD30)} />
      </Section>

      <Section title={tr.stats.h6}>
        <Row label={tr.stats.clubViews} value={String(s.clubViews)} />
        <Row label={tr.stats.clubInterested} value={yn(s.clubInterested)} />
      </Section>

      <Pressable onPress={redo} hitSlop={10} style={{ marginTop: 24, alignSelf: 'center' }}>
        <Text style={styles.link}>{tr.stats.redo}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ marginTop: 14 }}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </Card>
  );
}

function Row({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.rowValue, small && { fontSize: 14, flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  back: { fontSize: 40, fontWeight: '300', color: colors.text, marginRight: 12, marginTop: -6 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  intro: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 8 },
  section: { fontSize: 13, fontWeight: '800', color: colors.accent, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowLabel: { fontSize: 15, color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rowValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  link: { fontSize: 14, fontWeight: '600', color: colors.muted, textDecorationLine: 'underline' },
});
