import { router } from 'expo-router';
import { Fragment } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../../components/CupRow';
import { Icon } from '../../components/Icon';
import { WeekChart } from '../../components/WeekChart';
import { WeekStrip } from '../../components/WeekStrip';
import { MetricTile, MiniRing, Pager } from '../../components/dashboard';
import { FadeIn, Pop, PressScale, animateLayout, haptic } from '../../components/motion';
import { Card, PillButton } from '../../components/ui';
import { WEEKLY, WRAPPED_RULES } from '../../config/scoring.config';
import { tr, upper } from '../../i18n/tr';
import { agoLabel, caffeineToday, dailyNudge, levelProgress, weekPartAverages } from '../../lib/home';
import { insights } from '../../lib/insights';
import { computePalateTypeId, getPalateType } from '../../lib/palate';
import { addDays, currentStreak, dayKey, discoveriesIn, inRange, periodRange, startOfWeek, weekStrip, weeklyPalateScore } from '../../lib/progress';
import { setReminderEnabled } from '../../lib/reminders';
import { levelFor } from '../../lib/scoring';
import { updateMetrics } from '../../lib/storage';
import { useEntries } from '../../lib/useEntries';
import { useMetrics } from '../../lib/useMetrics';
import { useProfile } from '../../lib/useProfile';
import { useSettings } from '../../lib/useSettings';
import { colors, tint, type } from '../../theme';
import { useTabBarSpace } from '../../components/TabBar';

/**
 * Ana sayfa "Özet": Apple Fitness/Sağlık tarzı bölümlü yapı + Cal AI tarzı pano.
 * Bugün · Bu Hafta · Öne Çıkanlar · Son Fincanlar
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { width: screenW } = useWindowDimensions();
  const entries = useEntries();
  const list = entries ?? [];
  const profile = useProfile();
  const settings = useSettings();
  const [metrics, reloadMetrics] = useMetrics();
  const now = new Date();

  const todayKey = dayKey(now);
  const todays = list.filter((e) => dayKey(new Date(e.createdAt)) === todayKey);
  const todayScore = todays.length ? Math.max(...todays.map((e) => e.score)) : 0;
  const streak = currentStreak(list, now);
  const ws = startOfWeek(now);
  const weekEntries = list.filter((e) => inRange(e, ws, addDays(ws, 7)));
  const disc = discoveriesIn(list, ws, addDays(ws, 7));
  const discoveries = disc.places.length + disc.methods.length;
  const parts = weekPartAverages(list, now);
  const caffeine = caffeineToday(list, now);
  const level = levelProgress(list);
  const nudge = dailyNudge(list, now);
  const highlights = insights(list, now)
    .filter((h) => settings.showCaffeine || h.id !== 'caffeine')
    .slice(0, 3);
  const type_ = list.length ? getPalateType(computePalateTypeId(list)) : profile ? getPalateType(profile.starterTypeId) : null;
  const askReminder = !!metrics && metrics.reminderEnabled === null && list.length >= 1;
  const dateLabel = upper(now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }));
  const pageW = screenW - 40;

  async function answerReminder(yes: boolean) {
    animateLayout();
    if (yes) {
      const ok = await setReminderEnabled(true);
      if (!ok) Alert.alert(tr.profile.reminderDenied);
    } else {
      await updateMetrics((m) => {
        m.reminderEnabled = false;
      }).catch(() => {});
    }
    reloadMetrics();
  }

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

  const scorePage = (
    <View key="score">
      <Card style={styles.bigCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bigNumber}>{todays.length ? todayScore : '–'}</Text>
          <Text style={styles.cardTitle}>{tr.home.todayScore}</Text>
          <Text style={styles.cardSub}>{todays.length ? levelFor(todayScore) : tr.home.noCupToday}</Text>
        </View>
        <MiniRing
          size={112}
          stroke={11}
          fraction={todays.length ? todayScore / 100 : 0}
          center={<Icon name={todays.length ? 'trophy' : 'cafe-outline'} size={32} color={colors.accent} />}
        />
      </Card>
      <View style={styles.tiles}>
        <MetricTile value={`+${parts.effort.avg}`} label={tr.home.effortWeek} fraction={parts.effort.fraction} color={tint.amber} icon="hand-left" />
        <MetricTile value={`+${parts.discovery.avg}`} label={tr.home.discoveryWeek} fraction={parts.discovery.fraction} color={tint.cherry} icon="compass" />
        <MetricTile value={`+${parts.depth.avg}`} label={tr.home.depthWeek} fraction={parts.depth.fraction} color={tint.espresso} icon="leaf" />
      </View>
    </View>
  );

  const caffeinePage = (
    <View key="caffeine">
      <Card style={styles.bigCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bigNumber}>
            {caffeine.mg}
            <Text style={styles.bigUnit}> mg</Text>
          </Text>
          <Text style={styles.cardTitle}>{tr.home.caffeineToday}</Text>
          <Text style={styles.cardSub}>{tr.home.caffeineRef(settings.caffeineRef)}</Text>
        </View>
        <MiniRing
          size={112}
          stroke={11}
          fraction={caffeine.mg / settings.caffeineRef}
          color={caffeine.mg > settings.caffeineRef ? tint.cherry : tint.amber}
          center={<Icon name="flash" size={32} color={caffeine.mg > settings.caffeineRef ? tint.cherry : tint.amber} />}
        />
      </Card>
      <View style={styles.tiles}>
        <MetricTile value={String(caffeine.cups)} label={tr.home.cupsToday} fraction={caffeine.cups / 4} color={tint.amber} icon="cafe" />
        <MetricTile
          value={agoLabel(caffeine.minutesSinceLast)}
          label={tr.home.lastCup}
          fraction={caffeine.minutesSinceLast === null ? 0 : Math.min(1, caffeine.minutesSinceLast / 360)}
          color={tint.cherry}
          icon="time"
        />
        <MetricTile value={String(parts.cups)} label={tr.home.cupsWeek} fraction={parts.cups / 14} color={tint.espresso} icon="calendar" />
      </View>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: tabSpace }}
    >
      {/* Başlık: tarih + büyük "Özet" (Apple Fitness gibi) */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.largeTitle}>{tr.home.summary}</Text>
        </View>
        <View style={styles.streak}>
          <Pop trigger={streak}>
            <Icon name="flame" size={16} color={streak > 0 ? tint.cherry : colors.muted} />
          </Pop>
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </View>

      <WeekStrip days={weekStrip(list, now)} />

      {entries && list.length === 0 ? (
        <Card style={[styles.ctaCard, { marginTop: 20 }]}>
          <Text style={styles.ctaTitle}>{tr.home.ctaTitle}</Text>
          <Text style={styles.ctaBody}>{type_ ? tr.home.ctaBodyWithType(type_.name) : tr.home.ctaBody}</Text>
          <PillButton label={tr.home.ctaButton} variant="light" onPress={() => router.push('/new')} style={{ marginTop: 16 }} />
        </Card>
      ) : (
        <>
          {/* BUGÜN */}
          <SectionHeader title={tr.home.today} />
          <Pager key={settings.showCaffeine ? 2 : 1} width={pageW} pages={settings.showCaffeine ? [scorePage, caffeinePage] : [scorePage]} />

          {askReminder ? (
            <Card style={{ marginTop: 14 }}>
              <View style={styles.inlineTitle}>
                <Icon name="notifications" size={18} color={tint.cherry} />
                <Text style={styles.cardTitleDark}>{tr.homePrompt.reminderTitle}</Text>
              </View>
              <Text style={styles.cardSub}>{tr.homePrompt.reminderBody}</Text>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <PillButton label={tr.homePrompt.no} variant="light" onPress={() => answerReminder(false)} style={{ flex: 1, marginRight: 8, height: 46 }} />
                <PillButton label={tr.homePrompt.yes} onPress={() => answerReminder(true)} style={{ flex: 2, height: 46 }} />
              </View>
            </Card>
          ) : null}

          {/* BU HAFTA */}
          <SectionHeader title={tr.home.thisWeek} />
          <FadeIn index={0}>
            <Card>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.cardTitle}>{tr.progress.weeklyScore}</Text>
                  <Text style={styles.chartValue}>{weeklyPalateScore(weekEntries)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardTitle}>{tr.home.weekCups}</Text>
                  <Text style={styles.chartValueSmall}>{weekEntries.length}</Text>
                </View>
              </View>
              <WeekChart days={weekStrip(list, now)} />
              <View style={styles.goalRow}>
                <Icon name={discoveries >= WEEKLY.discoveryGoal ? 'checkmark-circle' : 'compass-outline'} size={18} color={tint.amber} />
                <Text style={styles.goalText}>
                  {discoveries >= WEEKLY.discoveryGoal ? tr.home.goalDone : tr.home.goal(discoveries, WEEKLY.discoveryGoal)}
                </Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.min(1, discoveries / WEEKLY.discoveryGoal) * 100}%` }]} />
              </View>
            </Card>
          </FadeIn>

          {type_ ? (
            <FadeIn index={1}>
              <PressScale
                onPress={() => {
                  haptic.light();
                  router.push('/card');
                }}
                scaleTo={0.98}
                style={styles.typeCard}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.typeIcon}>
                    <Icon name="color-palette" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{tr.home.palateType}</Text>
                    <Text style={styles.typeName}>{type_.name}</Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.tertiary} />
                </View>
                {level ? (
                  <>
                    <View style={[styles.bar, { marginTop: 14 }]}>
                      <View style={[styles.barFill, { backgroundColor: colors.black, width: `${Math.max(4, level.fraction * 100)}%` }]} />
                    </View>
                    <Text style={styles.cardSub}>
                      {level.next ? tr.home.levelNext(level.level, level.next, level.toNext) : tr.home.levelTop(level.level)}
                    </Text>
                  </>
                ) : null}
              </PressScale>
            </FadeIn>
          ) : null}

          {banner ? (
            <FadeIn index={2}>
            <PressScale
              onPress={() => {
                haptic.light();
                router.push({ pathname: '/wrapped', params: { period: 'month', offset: String(banner.offset) } });
              }}
              scaleTo={0.97}
              style={styles.banner}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerSub}>{tr.wrapped.bannerSub}</Text>
              </View>
              <View style={styles.bannerPlay}>
                <Icon name="play" size={20} color={colors.black} />
              </View>
            </PressScale>
            </FadeIn>
          ) : null}

          {/* ÖNE ÇIKANLAR */}
          {nudge || highlights.length ? (
            <>
              <SectionHeader title={tr.home.highlights} />
              <FadeIn index={2}>
                <View style={styles.group}>
                  {nudge ? (
                    <HighlightRow icon="bulb" color={tint.amber} title={tr.home.nudgeTitle} text={nudge.text} />
                  ) : null}
                  {highlights.map((h, i) => (
                    <Fragment key={h.id}>
                      {nudge || i > 0 ? <View style={styles.separator} /> : null}
                      <HighlightRow
                        icon={h.icon}
                        color={h.icon === 'trending-down' ? tint.cherry : h.icon === 'trending-up' ? tint.sage : tint.slate}
                        title={h.title}
                        text={h.text}
                      />
                    </Fragment>
                  ))}
                </View>
              </FadeIn>
            </>
          ) : null}

          {/* SON FİNCANLAR */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{tr.home.recent}</Text>
            {list.length > 5 ? (
              <PressScale onPress={() => router.push('/history')} hitSlop={10} scaleTo={0.94}>
                <Text style={styles.link}>{tr.home.seeAll}</Text>
              </PressScale>
            ) : null}
          </View>
          <FadeIn index={3}>
            <View style={styles.group}>
              {list.slice(0, 5).map((e, i) => (
                <Fragment key={e.id}>
                  {i > 0 ? <View style={[styles.separator, { marginLeft: 92 }]} /> : null}
                  <CupRow entry={e} showParts plain />
                </Fragment>
              ))}
            </View>
          </FadeIn>
        </>
      )}
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={[styles.sectionTitle, { marginTop: 28, marginBottom: 12 }]}>{title}</Text>;
}

function HighlightRow({ icon, color, title, text }: { icon: Parameters<typeof Icon>[0]['name']; color: string; title: string; text: string }) {
  return (
    <View style={styles.hlRow}>
      <View style={[styles.hlIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.hlTitle}>{title}</Text>
        <Text style={styles.hlText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  date: { ...type.sectionHeader },
  largeTitle: { ...type.largeTitle, marginTop: 2 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
    marginBottom: 4,
  },
  streakText: { ...type.headline, fontWeight: '700' },
  sectionTitle: { ...type.title2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  link: { ...type.body, color: colors.accentText },
  bigCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 22 },
  bigNumber: { fontSize: 48, fontWeight: '800', color: colors.text, letterSpacing: -1.5 },
  bigUnit: { fontSize: 20, fontWeight: '700', color: colors.muted, letterSpacing: 0 },
  cardTitle: { ...type.footnote, fontWeight: '600' },
  cardTitleDark: { ...type.headline },
  cardSub: { ...type.footnote, marginTop: 4, lineHeight: 18 },
  inlineTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  chartValue: { fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  chartValueSmall: { fontSize: 22, fontWeight: '800', color: colors.text },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  goalText: { ...type.subhead, color: colors.text, fontWeight: '600' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  typeCard: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  typeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  typeName: { ...type.title3, marginTop: 1 },
  banner: { marginTop: 12, backgroundColor: colors.black, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center' },
  bannerTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  bannerSub: { color: colors.mutedOnDark, fontSize: 13, marginTop: 4 },
  bannerPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 12, paddingLeft: 3 },
  group: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 56 },
  hlRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12 },
  hlIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  hlTitle: { ...type.footnote, fontWeight: '600' },
  hlText: { ...type.subhead, color: colors.text, marginTop: 1, lineHeight: 20 },
  ctaCard: { backgroundColor: colors.black },
  ctaTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
  ctaBody: { fontSize: 15, color: colors.mutedOnDark, marginTop: 6, lineHeight: 21 },
});
