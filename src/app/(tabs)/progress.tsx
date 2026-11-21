import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../../components/CupRow';
import { Card, Chip, PillButton } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { getPalateType } from '../../lib/palate';
import { addDays, periodReport, startOfMonth, startOfWeek, weeklyRecordBefore } from '../../lib/progress';
import { useEntries } from '../../lib/useEntries';
import { colors } from '../../theme';

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
  const type = report.palateTypeId ? getPalateType(report.palateTypeId) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}
    >
      <Text style={styles.title}>{tr.progress.title}</Text>
      <View style={{ flexDirection: 'row' }}>
        <Chip label={tr.progress.week} selected={kind === 'week'} onPress={() => setKind('week')} />
        <Chip label={tr.progress.month} selected={kind === 'month'} onPress={() => setKind('month')} />
      </View>

      <Card style={{ marginTop: 8 }}>
        <Text style={styles.label}>{tr.progress.weeklyScore}</Text>
        <Text style={styles.big}>{report.palateScore}</Text>
        {kind === 'week' ? (
          <Text style={[styles.label, isRecord && { color: colors.accent }]}>
            {isRecord ? tr.progress.newRecord : tr.progress.record(record)}
          </Text>
        ) : null}
        <View style={styles.grid}>
          <Stat value={report.cups} label={tr.progress.cups} />
          <Stat value={report.avg} label={tr.progress.avg} />
          <Stat value={report.places} label={tr.progress.places} />
          <Stat value={report.methods} label={tr.progress.methods} />
        </View>
        {type ? (
          <>
            <Text style={[styles.label, { marginTop: 8 }]}>{tr.progress.periodType}</Text>
            <Text style={styles.typeName}>{type.name}</Text>
          </>
        ) : null}
      </Card>

      {report.cups === 0 ? <Text style={styles.empty}>{tr.progress.empty}</Text> : null}

      {report.best ? (
        <>
          <Text style={styles.section}>{kind === 'week' ? tr.progress.bestCup : tr.progress.bestCupMonth}</Text>
          <CupRow entry={report.best} />
        </>
      ) : null}

      {report.cups > 0 ? (
        <PillButton
          label={`▶  ${kind === 'week' ? tr.wrapped.weekTitle : tr.wrapped.monthTitle}`}
          onPress={() => router.push({ pathname: '/wrapped', params: { period: kind } })}
          style={{ marginTop: 20, backgroundColor: colors.accent, borderColor: colors.accent }}
        />
      ) : null}

      <PillButton
        label={tr.progress.history}
        variant="light"
        onPress={() => router.push('/history')}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted },
  big: { fontSize: 64, fontWeight: '900', color: colors.text, letterSpacing: -2 },
  typeName: { fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  stat: { width: '50%', paddingVertical: 8 },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted },
  section: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 24, marginBottom: 12 },
  empty: { fontSize: 15, color: colors.muted, marginTop: 16, textAlign: 'center' },
});
