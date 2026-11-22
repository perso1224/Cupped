import { router } from 'expo-router';
import { Fragment } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CupRow } from '../../components/CupRow';
import { Icon } from '../../components/Icon';
import { WeekChart } from '../../components/WeekChart';
import { WeekStrip } from '../../components/WeekStrip';
import { Bean, CupGauge } from '../../components/coffee';
import { Pager } from '../../components/dashboard';
import { FadeIn, GrowBar, Pop, PressScale, animateLayout, haptic, useAnimatedRemovals, useIntroDone } from '../../components/motion';
import { Card, PillButton } from '../../components/ui';
import { WEEKLY, WRAPPED_RULES } from '../../config/scoring.config';
import { tr, upper } from '../../i18n/tr';
import { agoLabel, caffeineToday, dailyNudge, levelProgress, weekPartAverages } from '../../lib/home';
import { insights } from '../../lib/insights';
import { computePalateTypeId, getPalateType } from '../../lib/palate';
import { addDays, currentStreak, dayKey, discoveriesIn, inRange, periodRange, startOfWeek, wallBanner, weekDots, weekStrip, longestStreak, noteShares, favorites } from '../../lib/progress';
import { setReminderEnabled } from '../../lib/reminders';
import { partsSummary } from '../../lib/scoring';
import { exportAllData, updateMetrics } from '../../lib/storage';
import { shareFile } from '../../lib/share';
import { needsBackupNudge } from '../../lib/metrics';
import { useEntries } from '../../lib/useEntries';
import { useMetrics } from '../../lib/useMetrics';
import { useProfile } from '../../lib/useProfile';
import { useSettings } from '../../lib/useSettings';
import { colors, fonts, isDark, tint, type } from '../../theme';
import { useTabBarSpace, useTabScrollRef } from '../../components/TabBar';

/**
 * Ana sayfa "Özet". Bugün kafe menü tahtası gibi tek kartta (skor + noktalı satırlar).
 * Bugün · Bu Hafta · Öne Çıkanlar · Son Fincanlar
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const tabSpace = useTabBarSpace();
  const scrollRef = useTabScrollRef();
  const introDone = useIntroDone();
  const entries = useAnimatedRemovals(useEntries()); // silinen fincan "Son fincanlar"dan kayarak çıkar
  const list = entries ?? [];
  const profile = useProfile();
  const settings = useSettings();
  const [metrics, reloadMetrics] = useMetrics();
  const now = new Date();

  const todayKey = dayKey(now);
  const todays = list.filter((e) => dayKey(new Date(e.createdAt)) === todayKey);
  const bestToday = todays.reduce<(typeof todays)[number] | null>((b, e) => (!b || e.score > b.score ? e : b), null);
  const todayScore = bestToday?.score ?? 0;
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
  const wall = wallBanner(list, now);
  const askReminder = !!metrics && metrics.reminderEnabled === null && list.length >= 1;
  // Yedek hatırlatması: 10+ fincan ve 30 gündür yedek yok (hatırlatma sorusuyla aynı anda çıkmaz)
  const askBackup = !!metrics && !askReminder && needsBackupNudge(metrics, list.length, now);

  async function answerBackup(yes: boolean) {
    animateLayout();
    if (yes) {
      try {
        if (await shareFile(await exportAllData())) {
          await updateMetrics((m) => {
            m.lastBackupAt = new Date().toISOString();
          });
        }
      } catch {
        Alert.alert(tr.profile.exportError);
      }
    } else {
      await updateMetrics((m) => {
        m.backupNudgeAt = new Date().toISOString();
      }).catch(() => {});
    }
    reloadMetrics();
  }
  const dateLabel = upper(now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }));

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

  const over = caffeine.mg > settings.caffeineRef;
  const pageW = screenW - 40;
  const longest = longestStreak(list);
  const notesMap = noteShares(list).slice(0, 4);
  const fav = favorites(list);

  // Ana sayfanın kaydırmalı "menü tahtası": en fazla 5 sayfa, hepsi aynı koyu kahve zeminde.
  const todayPage = (
    <View key="today" style={styles.board}>
      <View style={styles.boardTop}>
        <CupGauge size={104} fraction={todays.length ? todayScore / 100 : 0} onDark={isDark} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.boardKicker}>{upper(tr.home.todayScore)}</Text>
          <Text style={styles.boardScore}>{todays.length ? todayScore : '–'}</Text>
          <Text style={styles.boardSub}>{bestToday ? partsSummary(bestToday.parts, tr.result.breakdown) : tr.home.noCupToday}</Text>
        </View>
      </View>
      <View style={styles.boardRule} />
      <MenuLine color={tint.amber} label={tr.home.effortWeek} value={`+${parts.effort.avg}`} />
      <MenuLine color={tint.cherry} label={tr.home.discoveryWeek} value={`+${parts.discovery.avg}`} />
      <MenuLine color={SAGE_ON_DARK} label={tr.home.depthWeek} value={`+${parts.depth.avg}`} />
    </View>
  );

  const caffeinePage = (
    <View key="caffeine" style={styles.board}>
      <Text style={styles.boardKicker}>{upper(tr.home.caffeineToday)}</Text>
      <Text style={styles.boardScore}>
        {caffeine.mg}
        <Text style={styles.boardUnit}> mg</Text>
      </Text>
      <View style={styles.boardTrack}>
        <View
          style={[
            styles.boardFill,
            { width: `${Math.min(1, caffeine.mg / settings.caffeineRef) * 100}%`, backgroundColor: over ? tint.cherry : tint.amber },
          ]}
        />
      </View>
      <Text style={styles.boardSub}>{tr.home.caffeineRef(settings.caffeineRef)}</Text>
      {/* Gün çizgisi: bugünkü kahveler saatine göre (06:00–24:00) */}
      <View style={styles.timeline}>
        <View style={styles.timelineLine} />
        {todays.map((e) => {
          const d = new Date(e.createdAt);
          const h = d.getHours() + d.getMinutes() / 60;
          return <View key={e.id} style={[styles.timelineDot, { left: `${Math.max(0, Math.min(1, (h - 6) / 18)) * 100}%` }]} />;
        })}
      </View>
      <View style={styles.timelineLabels}>
        {['06', '12', '18', '24'].map((t) => (
          <Text key={t} style={styles.timelineLabel}>
            {t}
          </Text>
        ))}
      </View>
      <MenuLine color={tint.amber} label={tr.home.cupsToday} value={`${caffeine.cups} fincan`} />
      <MenuLine color={tint.cherry} label={tr.home.lastCup} value={agoLabel(caffeine.minutesSinceLast)} />
    </View>
  );

  const streakPage = (
    <View key="streak" style={styles.board}>
      <View style={styles.boardTop}>
        <Bean size={64} color={BOARD.bean} line={isDark ? BOARD.text : colors.onColor} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.boardKicker}>{upper(tr.home.board.streak)}</Text>
          <Text style={styles.boardScore}>
            {streak}
            <Text style={styles.boardUnit}> {tr.home.board.days}</Text>
          </Text>
          <Text style={styles.boardSub}>{streak > 0 ? tr.home.board.streakKeep : tr.home.board.streakStart}</Text>
        </View>
      </View>
      <View style={styles.boardRule} />
      <View style={styles.weekDots}>
        {weekDots(list, now).map((d, i) => (
          <View key={d.key} style={{ alignItems: 'center', gap: 4 }}>
            <Text style={[styles.timelineLabel, d.isToday && { color: BOARD.text }]}>{tr.weekdaysShort[i]}</Text>
            <View style={[styles.weekDot, d.done && styles.weekDotOn, d.isToday && styles.weekDotToday]} />
          </View>
        ))}
      </View>
      <MenuLine color={tint.amber} label={tr.home.board.longest} value={`${longest} ${tr.home.board.days}`} />
    </View>
  );

  const tastePage = (
    <View key="taste" style={styles.board}>
      <Text style={styles.boardKicker}>{upper(tr.home.board.taste)}</Text>
      {notesMap.length ? (
        <View style={{ marginTop: 10, gap: 12 }}>
          {notesMap.map((n, i) => (
            <View key={n.note}>
              <View style={styles.noteHead}>
                <Text style={styles.menuLabel}>{tr.notes[n.note]}</Text>
                <Text style={styles.menuValue}>%{n.pct}</Text>
              </View>
              <View style={styles.boardTrack}>
                <View style={[styles.boardFill, { width: `${n.pct}%`, backgroundColor: NOTE_COLORS[i] }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.boardSub, { marginTop: 10, lineHeight: 20 }]}>{tr.home.board.tasteEmpty}</Text>
      )}
    </View>
  );

  const favPage = (
    <View key="fav" style={styles.board}>
      <Text style={styles.boardKicker}>{upper(tr.home.board.favorites)}</Text>
      {fav.part ? <Text style={styles.boardTitle}>{tr.home.board.hourType(fav.part)}</Text> : null}
      <View style={styles.boardRule} />
      <MenuLine color={tint.cherry} label={tr.home.board.place} value={fav.place ?? '—'} />
      {fav.loved ? <MenuLine color={STAR_COLOR} label={tr.home.board.loved} value={`${fav.loved.name} ${tr.rating.avg(fav.loved.avg)}`} /> : null}
      <MenuLine color={tint.amber} label={tr.home.board.method} value={fav.method ? tr.methods[fav.method] : '—'} />
      <MenuLine color={SAGE_ON_DARK} label={tr.home.board.bean} value={fav.origin ?? '—'} />
      <MenuLine color={BOARD.muted} label={tr.home.board.hour} value={fav.hour !== null ? `${String(fav.hour).padStart(2, '0')}:00` : '—'} />
    </View>
  );

  const pages = [todayPage, ...(settings.showCaffeine ? [caffeinePage] : []), streakPage, tastePage, favPage];

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: tabSpace }}
    >
      {/* Açılış logosu bitene kadar boş: sonra başlık ve kartlar sırayla süzülür */}
      {introDone ? (
        <>
      {/* Başlık: tarih + büyük "Özet" (Apple Fitness gibi) */}
      <FadeIn index={0}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.largeTitle}>{tr.home.summary}</Text>
        </View>
        <View style={styles.streak}>
          <Pop trigger={streak}>
            <Bean size={18} color={streak > 0 ? tint.espresso : colors.tertiary} />
          </Pop>
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </View>
      </FadeIn>

      <FadeIn index={0}>
        <WeekStrip days={weekStrip(list, now)} />
      </FadeIn>

      {/* Kayıtlar okunana kadar (çok kısa) gövde çizilmez; böylece kartlar veriyle birlikte sırayla süzülür */}
      {entries === null ? null : list.length === 0 ? (
        <FadeIn index={1}>
        <Card style={[styles.ctaCard, { marginTop: 20 }]}>
          <Text style={styles.ctaTitle}>{tr.home.ctaTitle}</Text>
          <Text style={styles.ctaBody}>{type_ ? tr.home.ctaBodyWithType(type_.name) : tr.home.ctaBody}</Text>
          <PillButton label={tr.home.ctaButton} variant="light" onPress={() => router.push('/new')} style={{ marginTop: 16 }} />
        </Card>
        </FadeIn>
      ) : (
        <>
          {/* BUGÜN */}
          <View style={{ height: 16 }} />
          <FadeIn index={1}>
            <Pager key={pages.length} width={pageW} pages={pages} />
          </FadeIn>

          {askBackup ? (
            <FadeIn index={2}>
            <Card style={{ marginTop: 14 }}>
              <View style={styles.inlineTitle}>
                <Icon name="cloud-upload" size={18} color={tint.sky} />
                <Text style={styles.cardTitleDark}>{tr.homePrompt.backupTitle}</Text>
              </View>
              <Text style={styles.cardSub}>{tr.homePrompt.backupBody}</Text>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <PillButton label={tr.homePrompt.backupLater} variant="light" onPress={() => answerBackup(false)} style={{ flex: 1, marginRight: 8, height: 46 }} />
                <PillButton label={tr.homePrompt.backupYes} onPress={() => answerBackup(true)} style={{ flex: 2, height: 46 }} />
              </View>
            </Card>
            </FadeIn>
          ) : null}

          {askReminder ? (
            <FadeIn index={2}>
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
            </FadeIn>
          ) : null}

          {/* BU HAFTA */}
          <FadeIn index={3}>
            <SectionHeader title={tr.home.thisWeek} />
            <Card>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.cardTitle}>{tr.home.weekCups}</Text>
                  <Text style={styles.chartValue}>{weekEntries.length}</Text>
                </View>
                {weekEntries.length ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardTitle}>{tr.progress.avg}</Text>
                    <Text style={styles.chartValueSmall}>{Math.round(weekEntries.reduce((s, e) => s + e.score, 0) / weekEntries.length)}</Text>
                  </View>
                ) : null}
              </View>
              <WeekChart days={weekStrip(list, now)} />
              <View style={styles.goalRow}>
                <Icon name={discoveries >= WEEKLY.discoveryGoal ? 'checkmark-circle' : 'compass-outline'} size={18} color={tint.amber} />
                <Text style={styles.goalText}>
                  {discoveries >= WEEKLY.discoveryGoal ? tr.home.goalDone : tr.home.goal(discoveries, WEEKLY.discoveryGoal)}
                </Text>
              </View>
              <View style={styles.bar}>
                <GrowBar style={styles.barFill} fraction={discoveries / WEEKLY.discoveryGoal} />
              </View>
            </Card>
          </FadeIn>

          {type_ ? (
            <FadeIn index={4}>
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
                    <Icon name="color-palette" size={20} color={colors.white} />
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
                      <GrowBar style={[styles.barFill, { backgroundColor: colors.black }]} fraction={Math.max(0.04, level.fraction)} />
                    </View>
                    <Text style={styles.cardSub}>
                      {level.next ? tr.home.levelLine(level.level, level.xp, level.next, level.toNext) : tr.home.levelTopXp(level.level, level.xp)}
                    </Text>
                  </>
                ) : null}
              </PressScale>
            </FadeIn>
          ) : null}

          {banner ? (
            <FadeIn index={5}>
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

          {/* Fincan Duvarı: Aralık boyunca "hazırlanıyor", yıl sonunda "tamamlandı" */}
          {wall ? (
            <FadeIn index={5}>
              <PressScale
                onPress={() => {
                  haptic.light();
                  router.push('/wall');
                }}
                scaleTo={0.97}
                style={[styles.banner, { backgroundColor: tint.espresso }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerTitle, { color: colors.onColor }]}>
                    {wall.kind === 'building' ? tr.wall.bannerBuilding(wall.year) : tr.wall.bannerDone(wall.year)}
                  </Text>
                  <Text style={[styles.bannerSub, { color: 'rgba(255,255,255,0.75)' }]}>
                    {wall.kind === 'building' ? tr.wall.bannerBuildingSub(wall.daysLeft) : tr.wall.bannerDoneSub}
                  </Text>
                </View>
                <View style={styles.bannerPlay}>
                  <Icon name="grid" size={18} color={colors.black} />
                </View>
              </PressScale>
            </FadeIn>
          ) : null}

          {/* ÖNE ÇIKANLAR */}
          {nudge || highlights.length ? (
            <>
              <FadeIn index={6}>
              <SectionHeader title={tr.home.highlights} />
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
          <FadeIn index={7}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{tr.home.recent}</Text>
            {list.length > 5 ? (
              <PressScale onPress={() => router.push('/history')} hitSlop={10} scaleTo={0.94}>
                <Text style={styles.link}>{tr.home.seeAll}</Text>
              </PressScale>
            ) : null}
          </View>
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
        </>
      ) : null}
    </ScrollView>
  );
}

/** Menü tahtası renkleri: koyu kahve zemin, krem yazı. Tema değişse de sabit. */
/**
 * Tahta renkleri: açık temada beyaz kart + koyu yazı (eski açık görünüm),
 * koyu temada koyu kahve zemin + krem yazı.
 */
const BOARD = isDark
  ? { bg: '#2B1A12', text: '#F6EBDD', muted: '#CDBBA6', rule: 'rgba(246,235,221,0.18)', track: 'rgba(246,235,221,0.14)', faint: 'rgba(246,235,221,0.25)', bean: '#7A4A2A' }
  : { bg: colors.card, text: colors.text, muted: colors.muted, rule: colors.line, track: colors.line, faint: colors.line, bean: tint.espresso };
const SAGE_ON_DARK = isDark ? '#8FB08A' : tint.sage;
const STAR_COLOR = '#E3A43A';
const NOTE_COLORS = ['#D98B2B', '#C9604C', '#8FB08A', '#B99A7A'];

/** Kafe menüsü satırı: renkli nokta, ad, noktalı çizgi, değer. */
function MenuLine({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.menuLine} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.menuDot, { backgroundColor: color }]} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuLeader} numberOfLines={1} ellipsizeMode="clip">
        {' · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·'}
      </Text>
      <Text style={styles.menuValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  board: {
    backgroundColor: BOARD.bg,
    borderRadius: 24,
    padding: 18,
    borderWidth: isDark ? 1 : 0, // koyu temada zeminden ayrılsın
    borderColor: 'rgba(246,235,221,0.12)',
    flex: 1, // kaydırmalı sayfalar aynı yükseklikte
    minHeight: 300,
    shadowColor: '#2B1A12',
    shadowOpacity: isDark ? 0.18 : 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: isDark ? 0 : 3, // Android gölgesi
  },
  boardTop: { flexDirection: 'row', alignItems: 'center' },
  boardKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: BOARD.muted },
  boardScore: { fontSize: 56, fontFamily: fonts.heavy, color: BOARD.text, marginTop: 2 },
  boardSub: { fontSize: 14, color: BOARD.muted, marginTop: 2 },
  boardRule: { height: 1, backgroundColor: BOARD.rule, marginTop: 16, marginBottom: 6 },
  boardUnit: { fontSize: 20, fontFamily: fonts.semibold, color: BOARD.muted },
  boardTitle: { fontSize: 24, fontFamily: fonts.display, color: BOARD.text, marginTop: 6 },
  boardTrack: { height: 8, borderRadius: 4, backgroundColor: BOARD.track, overflow: 'hidden', marginTop: 8 },
  boardFill: { height: 8, borderRadius: 4 },
  timeline: { height: 16, marginTop: 18, justifyContent: 'center' },
  timelineLine: { height: 2, backgroundColor: BOARD.faint, borderRadius: 1 },
  timelineDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, marginLeft: -6, backgroundColor: '#D98B2B', borderWidth: 2, borderColor: BOARD.bg },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 6 },
  timelineLabel: { fontSize: 11, fontWeight: '600', color: BOARD.muted },
  weekDots: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: BOARD.faint },
  weekDotOn: { backgroundColor: '#D98B2B', borderColor: '#D98B2B' },
  weekDotToday: { borderColor: BOARD.text, borderWidth: 2 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  menuLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  menuDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: BOARD.text },
  menuLeader: { flex: 1, color: BOARD.muted, opacity: 0.6, marginHorizontal: 6, fontSize: 13, overflow: 'hidden' },
  menuValue: { fontSize: 17, fontFamily: fonts.display, color: BOARD.text, maxWidth: '55%', flexShrink: 1 },
  cardTitle: { ...type.footnote, fontWeight: '600' },
  cardTitleDark: { ...type.headline },
  cardSub: { ...type.footnote, marginTop: 4, lineHeight: 18 },
  inlineTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    elevation: 2,
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
