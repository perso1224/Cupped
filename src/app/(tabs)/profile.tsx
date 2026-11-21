import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountUp } from '../../components/motion';
import { Card, PillButton } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { getPalateType } from '../../lib/palate';
import { profileSummary } from '../../lib/progress';
import { setReminderEnabled } from '../../lib/reminders';
import { levelFor } from '../../lib/scoring';
import { shareFile } from '../../lib/share';
import { exportAllData, updateMetrics } from '../../lib/storage';
import { useEntries } from '../../lib/useEntries';
import { useMetrics } from '../../lib/useMetrics';
import { useProfile } from '../../lib/useProfile';
import { colors } from '../../theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const entries = useEntries() ?? [];
  const [metrics, reloadMetrics] = useMetrics();
  const exporting = useRef(false);

  // H6: Kulüp kartının kaç kez görüldüğü
  useFocusEffect(
    useCallback(() => {
      updateMetrics((m) => {
        m.clubViews += 1;
      }).catch(() => {});
    }, []),
  );

  const { avg, places, methods, palateTypeId } = profileSummary(entries);
  const profile = useProfile();
  const typeId = palateTypeId ?? profile?.starterTypeId ?? null;
  const type = typeId ? getPalateType(typeId) : null;

  async function toggleReminder(v: boolean) {
    const ok = await setReminderEnabled(v);
    if (v && !ok) Alert.alert(tr.profile.reminderDenied);
    reloadMetrics();
  }

  async function joinClub() {
    await updateMetrics((m) => {
      if (!m.clubInterestAt) m.clubInterestAt = new Date().toISOString();
    });
    reloadMetrics();
    Alert.alert(tr.profile.clubDone);
  }

  async function doExport() {
    if (exporting.current) return;
    exporting.current = true;
    try {
      await shareFile(await exportAllData());
    } catch {
      Alert.alert(tr.profile.exportError);
    } finally {
      exporting.current = false;
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}>
      <Text style={styles.title}>{profile?.nickname ? `@${profile.nickname}` : tr.profile.title}</Text>

      <PillButton label={tr.profile.showCard} onPress={() => router.push('/card')} style={{ marginBottom: 16 }} />

      {type ? (
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.label}>{palateTypeId ? tr.home.palateType : tr.profile.starter}</Text>
          <Text style={styles.typeName}>{type.name}</Text>
          <Text style={styles.tagline}>{type.tagline}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>
            {entries.length ? `${tr.result.level}: ${levelFor(avg)}` : ''}
            {entries.length && profile ? '  ·  ' : ''}
            {profile ? `${tr.profile.goal}: ${tr.onboarding.goal[profile.goal]}` : ''}
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.label}>{tr.profile.stats}</Text>
        <View style={styles.grid}>
          <Stat value={entries.length} label={tr.profile.cups} />
          <Stat value={avg} label={tr.profile.avg} />
          <Stat value={places} label={tr.profile.places} />
          <Stat value={methods} label={tr.profile.methods} />
        </View>
      </Card>

      <Card style={[styles.row, { marginTop: 16 }]}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.rowTitle}>{tr.profile.reminder}</Text>
          <Text style={styles.rowSub}>{tr.profile.reminderSub}</Text>
        </View>
        <Switch
          value={!!metrics?.reminderEnabled}
          onValueChange={toggleReminder}
          trackColor={{ true: colors.accent, false: colors.line }}
        />
      </Card>

      {/* H6 sahte kapı: ödeme yok, sadece ilgi ölçülür */}
      <Card style={[styles.club, { marginTop: 16 }]}>
        <Text style={styles.clubTitle}>{tr.profile.clubTitle}</Text>
        <Text style={styles.clubBody}>{tr.profile.clubBody}</Text>
        {metrics?.clubInterestAt ? (
          <Text style={styles.clubDone}>{tr.profile.clubDone}</Text>
        ) : (
          <PillButton label={tr.profile.clubCta} onPress={joinClub} style={{ marginTop: 14, backgroundColor: colors.accent, borderColor: colors.accent }} />
        )}
      </Card>

      <Pressable onPress={doExport} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
        <Card style={[styles.row, { marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{tr.profile.export}</Text>
            <Text style={styles.rowSub}>{tr.profile.exportSub}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push('/stats')} hitSlop={10} style={{ marginTop: 24, alignSelf: 'center' }}>
        <Text style={styles.link}>{tr.profile.testStats}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <CountUp value={value} style={styles.statValue} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted },
  typeName: { fontSize: 26, fontWeight: '900', color: colors.text, marginTop: 4 },
  tagline: { fontSize: 15, color: colors.muted, marginTop: 6, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  stat: { width: '50%', paddingVertical: 10 },
  statValue: { fontSize: 32, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted },
  link: { fontSize: 14, fontWeight: '600', color: colors.muted, textDecorationLine: 'underline' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  chev: { fontSize: 28, color: colors.muted, fontWeight: '300' },
  club: { backgroundColor: colors.black },
  clubTitle: { fontSize: 18, fontWeight: '900', color: colors.white },
  clubBody: { fontSize: 14, color: '#CFC8BE', marginTop: 6, lineHeight: 20 },
  clubDone: { fontSize: 14, fontWeight: '700', color: colors.accent, marginTop: 12 },
});
