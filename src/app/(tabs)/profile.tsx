import { FEATURES } from '../../config/brand';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { ListRow, ListSection } from '../../components/List';
import { CountUp } from '../../components/motion';
import { Card, PillButton } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { getPalateType, palateReason } from '../../lib/palate';
import { badgeProgress, profileSummary } from '../../lib/progress';
import { levelProgress } from '../../lib/home';
import { updateMetrics } from '../../lib/storage';
import { useEntries } from '../../lib/useEntries';
import { useMetrics } from '../../lib/useMetrics';
import { useProfile } from '../../lib/useProfile';
import { colors, radius, tint, type } from '../../theme';
import { GlassIconButton } from '../../components/NavButtons';
import { useTabBarSpace, useTabScrollRef } from '../../components/TabBar';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const scrollRef = useTabScrollRef();
  const entries = useEntries() ?? [];
  // Damak tipinin tek satırlık gerekçesi ("Neden: en sık yöntemin Espresso.")
  const reason = palateReason(entries);
  const reasonText = !reason
    ? null
    : reason.kind === 'notes'
      ? tr.palateReason.notes(tr.notes[reason.notes[0]], reason.notes[1] ? tr.notes[reason.notes[1]] : undefined)
      : reason.kind === 'nomad'
        ? tr.palateReason.nomad(reason.places, reason.of)
        : reason.kind === 'method'
          ? tr.palateReason.method(tr.methods[reason.method], reason.home)
          : tr.palateReason.settling;
  const [metrics, reloadMetrics] = useMetrics();
  const profile = useProfile();

  // H6: Kulüp kartının kaç kez görüldüğü
  useFocusEffect(
    useCallback(() => {
      if (!FEATURES.club) return;
      updateMetrics((m) => {
        m.clubViews += 1;
      }).catch(() => {});
    }, []),
  );

  const { avg, places, methods, palateTypeId, streak } = profileSummary(entries);
  const level = levelProgress(entries);
  const typeId = palateTypeId ?? profile?.starterTypeId ?? null;
  const type_ = typeId ? getPalateType(typeId) : null;
  const badges = badgeProgress(entries);
  const earned = badges.filter((b) => b.earned).length;
  const initial = (profile?.nickname?.trim()?.[0] ?? 'C').toLocaleUpperCase('tr-TR');

  async function joinClub() {
    await updateMetrics((m) => {
      if (!m.clubInterestAt) m.clubInterestAt = new Date().toISOString();
    }).catch(() => {});
    reloadMetrics();
    Alert.alert(tr.profile.clubDone);
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: tabSpace }}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.largeTitle}>{tr.profile.title}</Text>
        <GlassIconButton icon="settings-outline" iconSize={22} label={tr.settings.title} onPress={() => router.push('/settings')} fallback={styles.gear} />
      </View>

      {/* Kimlik */}
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.nick}>{profile?.nickname ? profile.nickname : tr.profile.noNick}</Text>
        {type_ ? <Text style={styles.typeLine}>{type_.name}</Text> : null}
        <PillButton label={tr.profile.showCard} onPress={() => router.push('/card')} style={{ marginTop: 14, alignSelf: 'stretch' }} />
      </View>

      {/* 3'lü özet */}
      <Card style={styles.statsCard}>
        <Stat value={entries.length} label={tr.profile.cups} />
        <View style={styles.vsep} />
        <Stat value={avg} label={tr.progress.avg} />
        <View style={styles.vsep} />
        <Stat value={streak} label={tr.profile.streakDays} />
      </Card>

      {type_ ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.cardTitle}>{!palateTypeId ? tr.profile.starter : entries.length < 5 ? tr.home.palateGuess(entries.length) : tr.home.palateType}</Text>
          <Text style={styles.typeName}>{type_.name}</Text>
          <Text style={styles.tagline}>{type_.tagline}</Text>
          {reasonText ? <Text style={styles.reason}>{reasonText}</Text> : null}
          <View style={styles.metaRow}>
            {level ? <Meta icon="podium" text={`${tr.result.level}: ${level.level}`} /> : null}
          </View>
        </Card>
      ) : null}

      <ListSection title={tr.profile.collection}>
        <ListRow icon="ribbon" tint={tint.amber} title={tr.profile.badges} value={`${earned}/${badges.length}`} chevron onPress={() => router.push('/collection/badges')} />
        <ListRow icon="location" tint={tint.cherry} title={tr.profile.placesPlural} value={String(places)} chevron onPress={() => router.push('/collection/places')} />
        <ListRow icon="cafe" tint={tint.espresso} title={tr.profile.methodsPlural} value={`${methods}/5`} chevron onPress={() => router.push('/collection/methods')} />
        <ListRow icon="people" tint={tint.cherry} title={tr.match.profileRow} chevron onPress={() => router.push('/match')} />
        <ListRow icon="time" tint={tint.slate} title={tr.progress.history} chevron onPress={() => router.push('/history')} />
      </ListSection>

      {/* H6 sahte kapı: ödeme yok, sadece ilgi ölçülür. Şimdilik askıda (FEATURES.club). */}
      {FEATURES.club ? (
      <View style={styles.club}>
        <View style={styles.clubHead}>
          <View style={styles.clubIcon}>
            <Icon name="sparkles" size={20} color={colors.black} />
          </View>
          <Text style={[styles.clubTitle, { flex: 1 }]}>{tr.profile.clubTitle}</Text>
          {metrics?.clubInterestAt ? <Icon name="checkmark-circle" size={24} color={colors.accent} /> : null}
        </View>
        <Text style={styles.clubBody}>{metrics?.clubInterestAt ? tr.profile.clubDone : tr.profile.clubBody}</Text>
        {metrics?.clubInterestAt ? null : (
          <PillButton label={tr.profile.clubCtaShort} variant="accent" onPress={joinClub} style={{ marginTop: 14, height: 46 }} />
        )}
      </View>
      ) : null}
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

function Meta({ icon, text }: { icon: 'podium' | 'flag'; text: string }) {
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={14} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reason: { ...type.footnote, color: colors.accentText, marginTop: 8, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  largeTitle: { ...type.largeTitle },
  gear: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', marginTop: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 36, fontWeight: '800' },
  nick: { ...type.title3, marginTop: 10 },
  typeLine: { ...type.subhead, marginTop: 2 },
  statsCard: { flexDirection: 'row', marginTop: 20, paddingVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...type.stat },
  statLabel: { ...type.caption, marginTop: 2, textAlign: 'center' },
  vsep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 4 },
  cardTitle: { ...type.footnote, fontWeight: '600' },
  typeName: { ...type.title2, marginTop: 2 },
  tagline: { ...type.subhead, marginTop: 6, lineHeight: 21 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { ...type.footnote, fontWeight: '600' },
  club: { marginTop: 24, backgroundColor: colors.black, borderRadius: radius.tile, padding: 16 },
  clubHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clubIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  clubTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  clubBody: { color: colors.mutedOnDark, fontSize: 14, marginTop: 10, lineHeight: 20 },
});
