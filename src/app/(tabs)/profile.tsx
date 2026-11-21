import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { ListRow, ListSection } from '../../components/List';
import { CountUp, PressScale } from '../../components/motion';
import { Card, PillButton } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { getPalateType } from '../../lib/palate';
import { badgeProgress, profileSummary } from '../../lib/progress';
import { levelFor } from '../../lib/scoring';
import { updateMetrics } from '../../lib/storage';
import { useEntries } from '../../lib/useEntries';
import { useMetrics } from '../../lib/useMetrics';
import { useProfile } from '../../lib/useProfile';
import { colors, tint, type } from '../../theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const entries = useEntries() ?? [];
  const [metrics, reloadMetrics] = useMetrics();
  const profile = useProfile();

  // H6: Kulüp kartının kaç kez görüldüğü
  useFocusEffect(
    useCallback(() => {
      updateMetrics((m) => {
        m.clubViews += 1;
      }).catch(() => {});
    }, []),
  );

  const { avg, places, methods, palateTypeId, streak } = profileSummary(entries);
  const typeId = palateTypeId ?? profile?.starterTypeId ?? null;
  const type_ = typeId ? getPalateType(typeId) : null;
  const badges = badgeProgress(entries);
  const earned = badges.filter((b) => b.earned).length;
  const initial = (profile?.nickname?.trim()?.[0] ?? 'C').toLocaleUpperCase('tr-TR');

  async function joinClub() {
    await updateMetrics((m) => {
      if (!m.clubInterestAt) m.clubInterestAt = new Date().toISOString();
    });
    reloadMetrics();
    Alert.alert(tr.profile.clubDone);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 48 }}
    >
      <View style={styles.header}>
        <Text style={styles.largeTitle}>{tr.profile.title}</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12} style={styles.gear} accessibilityLabel={tr.settings.title}>
          <Icon name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Kimlik */}
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.nick}>{profile?.nickname ? `@${profile.nickname}` : tr.profile.noNick}</Text>
        {type_ ? <Text style={styles.typeLine}>{type_.name}</Text> : null}
        <PillButton label={tr.profile.showCard} onPress={() => router.push('/card')} style={{ marginTop: 14, alignSelf: 'stretch' }} />
      </View>

      {/* 3'lü özet */}
      <Card style={styles.statsCard}>
        <Stat value={entries.length} label={tr.profile.cups} />
        <View style={styles.vsep} />
        <Stat value={avg} label={tr.profile.avg} />
        <View style={styles.vsep} />
        <Stat value={streak} label={tr.profile.streakDays} />
      </Card>

      {type_ ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.cardTitle}>{palateTypeId ? tr.home.palateType : tr.profile.starter}</Text>
          <Text style={styles.typeName}>{type_.name}</Text>
          <Text style={styles.tagline}>{type_.tagline}</Text>
          <View style={styles.metaRow}>
            {entries.length ? <Meta icon="podium" text={`${tr.result.level}: ${levelFor(avg)}`} /> : null}
            {profile ? <Meta icon="flag" text={tr.onboarding.goal[profile.goal]} /> : null}
          </View>
        </Card>
      ) : null}

      <ListSection title={tr.profile.collection}>
        <ListRow icon="ribbon" tint={tint.amber} title={tr.profile.badges} value={`${earned}/${badges.length}`} chevron onPress={() => router.push('/passport')} />
        <ListRow icon="location" tint={tint.cherry} title={tr.profile.places} value={String(places)} chevron onPress={() => router.push('/passport')} />
        <ListRow icon="cafe" tint={tint.espresso} title={tr.profile.methods} value={`${methods}/5`} chevron onPress={() => router.push('/passport')} />
        <ListRow icon="time" tint={tint.slate} title={tr.progress.history} chevron onPress={() => router.push('/history')} />
      </ListSection>

      {/* H6 sahte kapı: ödeme yok, sadece ilgi ölçülür */}
      <PressScale onPress={metrics?.clubInterestAt ? undefined : joinClub} scaleTo={0.98} style={styles.club}>
        <View style={styles.clubIcon}>
          <Icon name="sparkles" size={20} color={colors.black} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.clubTitle}>{tr.profile.clubTitle}</Text>
          <Text style={styles.clubBody}>{metrics?.clubInterestAt ? tr.profile.clubDone : tr.profile.clubBody}</Text>
        </View>
        {metrics?.clubInterestAt ? (
          <Icon name="checkmark-circle" size={24} color={colors.accent} />
        ) : (
          <View style={styles.clubCta}>
            <Text style={styles.clubCtaText}>{tr.profile.clubCtaShort}</Text>
          </View>
        )}
      </PressScale>
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
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  statLabel: { ...type.caption, marginTop: 2 },
  vsep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 4 },
  cardTitle: { ...type.footnote, fontWeight: '600' },
  typeName: { ...type.title2, marginTop: 2 },
  tagline: { ...type.subhead, marginTop: 6, lineHeight: 21 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { ...type.footnote, fontWeight: '600' },
  club: { marginTop: 24, backgroundColor: colors.black, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clubIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  clubTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  clubBody: { color: '#CFC8BE', fontSize: 13, marginTop: 3, lineHeight: 18 },
  clubCta: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  clubCtaText: { color: colors.black, fontWeight: '700', fontSize: 13 },
});
