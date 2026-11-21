import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../../components/CupRow';
import { CountUp, FadeIn } from '../../components/motion';
import { Card, PillButton, Segmented } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { getPalateType } from '../../lib/palate';
import { addDays, inRange, periodRange, periodReport, startOfMonth, startOfWeek, weeklyRecordBefore } from '../../lib/progress';
import { useEntries } from '../../lib/useEntries';
import { colors, layout, type } from '../../theme';

export default function Progress() {
  const insets = useSafeAreaInsets();
  const entries = useEntries() ?? [];
  const [kind, setKind] = useState<'week' | 'month'>('week');

  const now = new Date();
  const ws = startOfWeek(now);
  const ms = startOfMonth(now);
  const report =
    kind === 'week'
      ? periodReport(entries, ws, addDays(ws, 7))
      : periodReport(entries, ms, new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const record = weeklyRecordBefore(entries, ws);
  const isRecord = kind === 'week' && report.palateScore > record && record > 0;
  const palate = report.palateTypeId ? getPalateType(report.palateTypeId) : null;
  const prev = periodRange(kind, -1, now);
  const hasPrev = entries.some((e) => inRange(e, prev.start, prev.end));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + layout.topPad, paddingHorizontal: layout.screenPad, paddingBottom: 48 }}
    >
      <Text style={styles.title}>{tr.progress.title}</Text>
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'week', label: tr.progress.week },
          { value: 'month', label: tr.progress.month },
        ]}
      />

      <FadeIn index={0} key={kind}>
        <Card style={{ marginTop: 14 }}>
          {kind === 'week' ? (
            <>
              {/* Haftalık Damak Skoru sadece haftalık anlamlı (çeşitlilik puanı ay boyunca hep 100'e dayanır) */}
              <Text style={styles.label}>{tr.progress.weeklyScore}</Text>
              <CountUp value={report.palateScore} style={styles.big} />
              <Text style={[styles.label, isRecord && { color: colors.accentText }]}>
                {isRecord ? tr.progress.newRecord : record > 0 ? tr.progress.record(record) : tr.progress.firstWeek}
              </Text>
            </>
          ) : (
            <Text style={styles.label}>{tr.progress.monthSummary}</Text>
          )}
          <View style={styles.grid}>
            <Stat value={report.cups} label={tr.progress.cups} />
            <Stat value={report.avg} label={tr.progress.avg} />
            <Stat value={report.places} label={tr.progress.places} />
            {kind === 'month' ? (
              <Stat value={report.newPlaces} label={tr.progress.newPlaces} />
            ) : (
              <Stat value={report.methods} label={tr.progress.methods} />
            )}
          </View>
          {palate ? (
            <>
              <Text style={[styles.label, { marginTop: 8 }]}>{tr.progress.periodType}</Text>
              <Text style={styles.typeName}>{palate.name}</Text>
            </>
          ) : null}
        </Card>
      </FadeIn>

      {report.cups === 0 ? <Text style={styles.empty}>{tr.progress.empty}</Text> : null}

      {report.best ? (
        <FadeIn index={1} key={`best-${kind}`}>
          <Text style={styles.section}>{kind === 'week' ? tr.progress.bestCup : tr.progress.bestCupMonth}</Text>
          <CupRow entry={report.best} showParts />
        </FadeIn>
      ) : null}

      <FadeIn index={2}>
        {report.cups > 0 ? (
          <PillButton
            label={kind === 'week' ? tr.wrapped.weekTitle : tr.wrapped.monthTitle}
            icon="play"
            variant="accent"
            onPress={() => router.push({ pathname: '/wrapped', params: { period: kind, offset: '0' } })}
            style={{ marginTop: 20 }}
          />
        ) : null}
        {hasPrev ? (
          <PillButton
            label={kind === 'week' ? tr.wrapped.lastWeek : tr.wrapped.lastMonth}
            icon="play-back"
            variant="light"
            onPress={() => router.push({ pathname: '/wrapped', params: { period: kind, offset: '-1' } })}
            style={{ marginTop: 12 }}
          />
        ) : null}
        <PillButton label={tr.progress.history} icon="time-outline" variant="light" onPress={() => router.push('/history')} style={{ marginTop: 12 }} />
      </FadeIn>
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
  title: { ...type.largeTitle, marginBottom: 14 },
  label: { ...type.footnote, fontWeight: '600' },
  big: { ...type.display, fontSize: 56 },
  typeName: { ...type.title2, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  stat: { width: '50%', paddingVertical: 8 },
  statValue: { ...type.stat },
  statLabel: { ...type.footnote },
  section: { ...type.title2, marginTop: 28, marginBottom: 12 },
  empty: { ...type.subhead, marginTop: 16, textAlign: 'center' },
});
