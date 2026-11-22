import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../../components/CupRow';
import { Icon } from '../../components/Icon';
import { CountUp, FadeIn } from '../../components/motion';
import { TrendChart } from '../../components/TrendChart';
import { Bean } from '../../components/coffee';
import { Card, PillButton, Segmented } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { getPalateType } from '../../lib/palate';
import { levelProgress } from '../../lib/home';
import { addDays, currentStreak, inRange, periodRange, periodReport, scoreTrend, startOfMonth, startOfWeek, weekDots, weeklyRecordBefore, type TrendRange } from '../../lib/progress';
import { useEntries } from '../../lib/useEntries';
import { colors, fonts, layout, tint, type } from '../../theme';
import { useTabBarSpace } from '../../components/TabBar';

export default function Progress() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const entries = useEntries() ?? [];
  const [kind, setKind] = useState<'week' | 'month'>('week');
  const [range, setRange] = useState<TrendRange>('3m');

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
  const level = levelProgress(entries);
  const streak = currentStreak(entries, now);
  const dots = weekDots(entries, now);
  const trend = scoreTrend(entries, range, now);
  const trendAvg = trend.points.length ? Math.round(trend.points.reduce((s, p) => s + p.avg, 0) / trend.points.length) : 0;
  const trendMsg =
    trend.change === null ? null : trend.change >= 2 ? tr.progress.trendUp(trend.change) : trend.change <= -2 ? tr.progress.trendDown(-trend.change) : tr.progress.trendFlat;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + layout.topPad, paddingHorizontal: layout.screenPad, paddingBottom: tabSpace }}
    >
      <Text style={styles.title}>{tr.progress.title}</Text>

      {/* Üstte yan yana: seviye kartı + seri kartı */}
      <View style={styles.topRow}>
        <View style={[styles.levelCard, styles.lift]}>
          <View style={styles.levelBody}>
            <Text style={styles.label}>{tr.progress.yourLevel}</Text>
            <View style={styles.levelStamp}>
              <Text style={styles.levelName} numberOfLines={1} adjustsFontSizeToFit>
                {level?.level ?? '–'}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(4, (level?.fraction ?? 0) * 100)}%` }]} />
            </View>
            <Text style={styles.small} numberOfLines={2}>
              {level ? (level.next ? tr.progress.toNext(level.next, level.toNext) : tr.progress.topLevel) : tr.progress.levelEmpty}
            </Text>
          </View>
        </View>

        <View style={[styles.streakCard, styles.lift]}>
          <Bean size={30} />
          <CountUp value={streak} style={styles.streakNum} />
          <Text style={styles.label}>{tr.progress.streakTitle}</Text>
          <View style={styles.dots}>
            {dots.map((d, i) => (
              <View key={d.key} style={{ alignItems: 'center', gap: 3 }}>
                <Text style={[styles.dotLetter, d.isToday && { color: colors.text }]}>{tr.weekdaysShort[i]}</Text>
                <View style={[styles.dot, d.done && styles.dotOn, d.isToday && styles.dotToday]} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Skor gelişimi grafiği */}
      <Card style={[styles.lift, { marginTop: 14 }]}>
        <View style={styles.trendHead}>
          <Text style={styles.cardTitle}>{tr.progress.trendTitle}</Text>
          {trend.points.length ? (
            <View style={styles.chip}>
              <Icon name="flag-outline" size={12} color={colors.text} />
              <Text style={styles.chipText}>{tr.progress.trendAvg(trendAvg)}</Text>
            </View>
          ) : null}
        </View>
        {trend.points.length >= 2 ? (
          <View style={{ marginTop: 12 }}>
            <TrendChart key={range} points={trend.points} />
          </View>
        ) : (
          <Text style={[styles.small, { marginVertical: 28, textAlign: 'center' }]}>{tr.progress.trendNeedMore}</Text>
        )}
        <View style={{ marginTop: 12 }}>
          <Segmented
            value={range}
            onChange={setRange}
            options={(['1m', '3m', '1y', 'all'] as const).map((r) => ({ value: r, label: tr.progress.ranges[r] }))}
          />
        </View>
        {trendMsg ? (
          <View style={[styles.msg, trend.change !== null && trend.change <= -2 && { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.msgText, trend.change !== null && trend.change <= -2 && { color: colors.accentText }]}>{trendMsg}</Text>
          </View>
        ) : null}
      </Card>

      <Text style={styles.section}>{tr.progress.periodReport}</Text>
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
        {entries.length > 0 ? (
  <PillButton label={tr.progress.history} icon="time-outline" variant="light" onPress={() => router.push('/history')} style={{ marginTop: 12 }} />
        ) : null}
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
  lift: { shadowColor: '#2B1A12', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  topRow: { flexDirection: 'row', gap: 12 },
  levelCard: { flex: 1, backgroundColor: colors.card, borderRadius: 22, overflow: 'hidden' },
  levelStamp: { alignSelf: 'flex-start', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6 },
  levelBody: { padding: 14, flex: 1 },
  levelName: { ...type.title2, color: colors.accentText },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginTop: 10 },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.text },
  small: { ...type.footnote, marginTop: 8 },
  streakCard: { flex: 1, backgroundColor: colors.card, borderRadius: 22, padding: 14, alignItems: 'center', justifyContent: 'center' },
  streakNum: { fontSize: 38, fontFamily: fonts.heavy, color: colors.text, marginTop: 2 },
  dots: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 10 },
  dotLetter: { fontSize: 9, fontWeight: '600', color: colors.muted },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: tint.espresso },
  dotToday: { borderWidth: 2, borderColor: colors.accent },
  trendHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...type.headline },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  msg: { marginTop: 12, backgroundColor: colors.successSoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  msgText: { fontSize: 13, fontWeight: '600', color: colors.success, textAlign: 'center' },
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
