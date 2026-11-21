import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../../components/CupRow';
import { WeekStrip } from '../../components/WeekStrip';
import { MetricTile, MiniRing, Pager } from '../../components/dashboard';
import { FadeIn, Pop, PressScale, animateLayout } from '../../components/motion';
import { Card, PillButton } from '../../components/ui';
import { BRAND } from '../../config/brand';
import { DAILY_CAFFEINE_REF, WEEKLY, WRAPPED_RULES } from '../../config/scoring.config';
import { tr } from '../../i18n/tr';
import { agoLabel, caffeineToday, dailyNudge, levelProgress, weekPartAverages } from '../../lib/home';
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
    animateLayout();
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
  const type = list.length
    ? getPalateType(computePalateTypeId(list))
    : profile
      ? getPalateType(profile.starterTypeId)
      : null;
  const streak = currentStreak(list, now);
  const { width: screenW } = useWindowDimensions();
  const pageW = screenW - 40;
  const parts = weekPartAverages(list, now);
  const caffeine = caffeineToday(list, now);
  const level = levelProgress(list);
  const nudge = dailyNudge(list, now);
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
          <Pop trigger={streak}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
          </Pop>
          <Text style={styles.streakText}>{tr.home.streak(streak)}</Text>
        </View>
      </View>

      <WeekStrip days={weekStrip(list, now)} />

      {entries && list.length === 0 ? (
        <Card style={[styles.ctaCard, { marginTop: 20 }]}>
          <Text style={styles.ctaTitle}>{tr.home.ctaTitle}</Text>
          <Text style={styles.ctaBody}>
            {type ? tr.home.ctaBodyWithType(type.name) : tr.home.ctaBody}
          </Text>
          <PillButton label={tr.home.ctaButton} variant="light" onPress={() => router.push('/new')} style={{ marginTop: 16 }} />
        </Card>
      ) : (
        <View style={{ marginTop: 20, marginHorizontal: -20 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <Pager
              width={pageW}
              pages={[
                // Sayfa 1: bugünkü skor + bu haftanın Emek / Keşif / Derinlik halkaları
                <View key="score">
                  <Card style={styles.bigCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bigNumber}>{todays.length ? todayScore : '–'}</Text>
                      <Text style={styles.cardLabel}>{tr.home.todayScore}</Text>
                      <Text style={styles.cardHint}>{todays.length ? levelFor(todayScore) : tr.home.noCupToday}</Text>
                    </View>
                    <MiniRing
                      size={112}
                      stroke={11}
                      fraction={todays.length ? todayScore / 100 : 0}
                      center={<Text style={{ fontSize: 34 }}>{todays.length ? '🎯' : '☕'}</Text>}
                    />
                  </Card>
                  <View style={styles.tiles}>
                    <MetricTile value={`+${parts.effort.avg}`} label={tr.home.effortWeek} fraction={parts.effort.fraction} color={colors.accent} icon="🫖" />
                    <MetricTile value={`+${parts.discovery.avg}`} label={tr.home.discoveryWeek} fraction={parts.discovery.fraction} color="#B5402F" icon="🧭" />
                    <MetricTile value={`+${parts.depth.avg}`} label={tr.home.depthWeek} fraction={parts.depth.fraction} color="#2B1A12" icon="👃" />
                  </View>
                </View>,
                // Sayfa 2: kafein (yaklaşık) + bugün / son kahve / bu hafta
                <View key="caffeine">
                  <Card style={styles.bigCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bigNumber}>
                        {caffeine.mg}
                        <Text style={styles.bigUnit}> mg</Text>
                      </Text>
                      <Text style={styles.cardLabel}>{tr.home.caffeineToday}</Text>
                      <Text style={styles.cardHint}>{tr.home.caffeineRef(DAILY_CAFFEINE_REF)}</Text>
                    </View>
                    <MiniRing
                      size={112}
                      stroke={11}
                      fraction={caffeine.mg / DAILY_CAFFEINE_REF}
                      color={caffeine.mg > DAILY_CAFFEINE_REF ? '#B5402F' : colors.accent}
                      center={<Text style={{ fontSize: 34 }}>⚡</Text>}
                    />
                  </Card>
                  <View style={styles.tiles}>
                    <MetricTile value={String(caffeine.cups)} label={tr.home.cupsToday} fraction={caffeine.cups / 4} color={colors.accent} icon="☕" />
                    <MetricTile value={agoLabel(caffeine.minutesSinceLast)} label={tr.home.lastCup} fraction={caffeine.minutesSinceLast === null ? 0 : Math.min(1, caffeine.minutesSinceLast / 360)} color="#B5402F" icon="⏱️" />
                    <MetricTile value={String(parts.cups)} label={tr.home.cupsWeek} fraction={parts.cups / 14} color="#2B1A12" icon="📅" />
                  </View>
                </View>,
              ]}
            />
          </View>
        </View>
      )}

      {type && list.length > 0 ? (
        <FadeIn index={1}>
          <PressScale onPress={() => router.push('/card')} scaleTo={0.98} style={styles.typeCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>{tr.home.palateType}</Text>
                <Text style={styles.typeName}>{type.name}</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </View>
            {level ? (
              <>
                <View style={styles.levelBar}>
                  <View style={[styles.levelFill, { width: `${Math.max(4, level.fraction * 100)}%` }]} />
                </View>
                <Text style={styles.levelText}>
                  {level.next ? tr.home.levelNext(level.level, level.next, level.toNext) : tr.home.levelTop(level.level)}
                </Text>
              </>
            ) : null}
          </PressScale>
        </FadeIn>
      ) : null}

      {nudge ? (
        <FadeIn index={2}>
          <Card style={styles.nudge}>
            <Text style={styles.nudgeEmoji}>{nudge.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{tr.home.nudgeTitle}</Text>
              <Text style={styles.nudgeText}>{nudge.text}</Text>
            </View>
          </Card>
        </FadeIn>
      ) : null}

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
        <PressScale
          onPress={() => router.push({ pathname: '/wrapped', params: { period: 'month', offset: String(banner.offset) } })}
          scaleTo={0.97}
          style={styles.banner}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Text style={styles.bannerSub}>{tr.wrapped.bannerSub}</Text>
          </View>
          <View style={styles.bannerPlay}>
            <Text style={styles.bannerPlayText}>▶</Text>
          </View>
        </PressScale>
      ) : null}

      {list.length > 0 ? (
      <View style={styles.sectionRow}>
        <Text style={styles.section}>{tr.home.recent}</Text>
        {list.length > 5 ? (
          <Pressable onPress={() => router.push('/history')} hitSlop={10}>
            <Text style={styles.link}>{tr.home.seeAll}</Text>
          </Pressable>
        ) : null}
      </View>
      ) : null}
      {list.slice(0, 5).map((e, i) => (
        <FadeIn key={e.id} index={i}>
          <CupRow entry={e} showParts />
        </FadeIn>
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
  bigCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 22 },
  bigNumber: { fontSize: 48, fontWeight: '900', color: colors.text, letterSpacing: -1.5 },
  bigUnit: { fontSize: 20, fontWeight: '800', color: colors.muted, letterSpacing: 0 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 10 },
  typeCard: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  chev: { fontSize: 28, color: colors.muted, fontWeight: '300' },
  levelBar: { height: 8, borderRadius: 4, backgroundColor: colors.line, marginTop: 12, overflow: 'hidden' },
  levelFill: { height: 8, borderRadius: 4, backgroundColor: colors.black },
  levelText: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 6 },
  nudge: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  nudgeEmoji: { fontSize: 28, marginRight: 12 },
  nudgeText: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2, lineHeight: 21 },
  ctaCard: { backgroundColor: colors.black },
  ctaTitle: { fontSize: 22, fontWeight: '900', color: colors.white },
  ctaBody: { fontSize: 15, color: '#CFC8BE', marginTop: 6, lineHeight: 21 },
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
