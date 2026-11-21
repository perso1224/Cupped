import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../../components/CupRow';
import { ScoreRing } from '../../components/ScoreRing';
import { WeekStrip } from '../../components/WeekStrip';
import { Card, PillButton } from '../../components/ui';
import { BRAND } from '../../config/brand';
import { WEEKLY, WRAPPED_RULES } from '../../config/scoring.config';
import { tr } from '../../i18n/tr';
import { computePalateTypeId, getPalateType } from '../../lib/palate';
import { addDays, currentStreak, dayKey, discoveriesIn, inRange, periodRange, startOfWeek, weekStrip } from '../../lib/progress';
import { levelFor } from '../../lib/scoring';
import { setReminderEnabled } from '../../lib/reminders';
import { updateMetrics } from '../../lib/storage';
import { useEntries } from '../../lib/useEntries';
import { useMetrics } from '../../lib/useMetrics';
import { useProfile } from '../../lib/useProfile';
import { colors } from '../../theme';

export default function Home() {
  const insets = useSafeAreaInsets();
  const entries = useEntries();
  const list = entries ?? [];
  const now = new Date();
  const todayKey = dayKey(now);
  const todays = list.filter((e) => dayKey(new Date(e.createdAt)) === todayKey);
  const todayScore = todays.length ? Math.max(...todays.map((e) => e.score)) : 0;
  const profile = useProfile();
  const [metrics, reloadMetrics] = useMetrics();
  const askReminder = !!metrics && metrics.reminderEnabled === null && list.length >= 1;

  async function answerReminder(yes: boolean) {
    if (yes) {
      const ok = await setReminderEnabled(true);
      if (!ok) Alert.alert(tr.profile.reminderDenied);
    } else {
      await updateMetrics((m) => {
        m.reminderEnabled = false;
      });
    }
    reloadMetrics();
  }
  const isStarter = list.length === 0 && !!profile;
  const type = list.length
    ? getPalateType(computePalateTypeId(list))
    : profile
      ? getPalateType(profile.starterTypeId)
      : null;
  const streak = currentStreak(list, now);
  const ws = startOfWeek(now);
  const disc = discoveriesIn(list, ws, addDays(ws, 7));
  const discoveries = disc.places.length + disc.methods.length;
  // Damak Özeti afişi: ayın ilk 7 gününde geçen ayın özeti (asıl "Wrapped anı"), sonra bu ayın özeti.
  const banner = (() => {
    const label = (d: Date) => {
      const m = d.toLocaleDateString('tr-TR', { month: 'long' });
      return m.charAt(0).toLocaleUpperCase('tr-TR') + m.slice(1);
    };
    const prev = periodRange('month', -1, now);
    if (now.getDate() <= 7 && list.some((e) => inRange(e, prev.start, prev.end))) {
      return { offset: -1, title: tr.wrapped.bannerMonth(label(prev.start)) };
    }
    const cur = periodRange('month', 0, now);
    if (list.filter((e) => inRange(e, cur.start, cur.end)).length >= WRAPPED_RULES.minCupsForBanner) {
      return { offset: 0, title: tr.wrapped.bannerMonthSoFar(label(cur.start)) };
    }
    return null;
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>{BRAND.name}</Text>
        <View style={styles.streak}>
          <Text style={{ fontSize: 16 }}>🔥</Text>
          <Text style={styles.streakText}>{tr.home.streak(streak)}</Text>
        </View>
      </View>

      <WeekStrip days={weekStrip(list, now)} />

      <Card style={[styles.todayCard, { marginTop: 20 }]}>
        <ScoreRing score={todayScore} size={150} caption={todays.length ? levelFor(todayScore) : undefined} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.cardLabel}>{tr.home.todayScore}</Text>
          {todays.length === 0 ? <Text style={styles.cardHint}>{tr.home.noCupToday}</Text> : null}
          {type ? (
            <>
              <Text style={[styles.cardLabel, { marginTop: 14 }]}>{isStarter ? tr.profile.starter : tr.home.palateType}</Text>
              <Text style={styles.typeName}>{type.name}</Text>
            </>
          ) : null}
        </View>
      </Card>

      <Card style={styles.goal}>
        <Text style={styles.goalText}>
          {discoveries >= WEEKLY.discoveryGoal ? tr.home.goalDone : tr.home.goal(discoveries, WEEKLY.discoveryGoal)}
        </Text>
        <View style={styles.goalBar}>
          <View style={[styles.goalFill, { width: `${Math.min(1, discoveries / WEEKLY.discoveryGoal) * 100}%` }]} />
        </View>
      </Card>

      {askReminder ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.goalText}>🔔 {tr.homePrompt.reminderTitle}</Text>
          <Text style={styles.promptBody}>{tr.homePrompt.reminderBody}</Text>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <PillButton label={tr.homePrompt.no} variant="light" onPress={() => answerReminder(false)} style={{ flex: 1, marginRight: 8, height: 46 }} />
            <PillButton label={tr.homePrompt.yes} onPress={() => answerReminder(true)} style={{ flex: 2, height: 46 }} />
          </View>
        </Card>
      ) : null}

      {banner ? (
        <Pressable
          onPress={() => router.push({ pathname: '/wrapped', params: { period: 'month', offset: String(banner.offset) } })}
          style={({ pressed }) => [styles.banner, pressed && { opacity: 0.85 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Text style={styles.bannerSub}>{tr.wrapped.bannerSub}</Text>
          </View>
          <View style={styles.bannerPlay}>
            <Text style={styles.bannerPlayText}>▶</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.sectionRow}>
        <Text style={styles.section}>{tr.home.recent}</Text>
        {list.length > 5 ? (
          <Pressable onPress={() => router.push('/history')} hitSlop={10}>
            <Text style={styles.link}>{tr.home.seeAll}</Text>
          </Pressable>
        ) : null}
      </View>
      {entries && list.length === 0 ? <Text style={styles.empty}>{tr.home.empty}</Text> : null}
      {list.slice(0, 5).map((e) => (
        <CupRow key={e.id} entry={e} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  streakText: { marginLeft: 6, fontWeight: '700', color: colors.text },
  todayCard: { flexDirection: 'row', alignItems: 'center' },
  cardLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  cardHint: { fontSize: 15, color: colors.text, marginTop: 4 },
  typeName: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 },
  goal: { marginTop: 12, paddingVertical: 16 },
  promptBody: { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 },
  goalText: { fontSize: 15, fontWeight: '700', color: colors.text },
  goalBar: { height: 8, borderRadius: 4, backgroundColor: colors.line, marginTop: 10, overflow: 'hidden' },
  goalFill: { height: 8, backgroundColor: colors.accent },
  banner: {
    marginTop: 12,
    backgroundColor: colors.black,
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTitle: { color: colors.white, fontSize: 17, fontWeight: '900' },
  bannerSub: { color: '#BDB6AC', fontSize: 13, marginTop: 4 },
  bannerPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  bannerPlayText: { color: colors.black, fontSize: 18, fontWeight: '900', marginLeft: 3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  section: { fontSize: 20, fontWeight: '800', color: colors.text },
  link: { fontSize: 15, fontWeight: '700', color: colors.accent },
  empty: { fontSize: 15, color: colors.muted, lineHeight: 22 },
});
