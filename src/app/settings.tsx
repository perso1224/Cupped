import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { ListRow, ListSection } from '../components/List';
import { tr } from '../i18n/tr';
import type { PalateGoal } from '../lib/onboarding';
import { refreshReminder, setReminderEnabled } from '../lib/reminders';
import { CAFFEINE_REFS, REMINDER_TIMES, timeLabel } from '../lib/settings';
import { shareFile } from '../lib/share';
import { deleteAllData, exportAllData, importBackup, saveProfile, updateSettings } from '../lib/storage';
import { useMetrics } from '../lib/useMetrics';
import { useProfile } from '../lib/useProfile';
import { useSettings } from '../lib/useSettings';
import { colors, tint, type } from '../theme';

const GOALS: PalateGoal[] = ['explore', 'brew', 'taste', 'log'];

/** Seçenek listesi: iOS'ta sistem uyarısı, web'de (test) ilk seçenek. */
function choose<T>(title: string, options: { label: string; value: T }[], onPick: (v: T) => void) {
  if (Platform.OS === 'web') return;
  Alert.alert(title, undefined, [
    ...options.map((o) => ({ text: o.label, onPress: () => onPick(o.value) })),
    { text: tr.settings.cancel, style: 'cancel' as const },
  ]);
}

function confirm(title: string, body: string, ok: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n${body}`)) onOk();
    return;
  }
  Alert.alert(title, body, [
    { text: tr.settings.cancel, style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const profile = useProfile();
  const [metrics, reloadMetrics] = useMetrics();
  const [nick, setNick] = useState<string | null>(null);
  const nickValue = nick ?? profile?.nickname ?? '';

  async function saveNick() {
    if (!profile || nick === null) return;
    await saveProfile({ ...profile, nickname: nick.trim().slice(0, 24) });
    setNick(null);
  }

  async function toggleReminder(v: boolean) {
    const ok = await setReminderEnabled(v);
    if (v && !ok) Alert.alert(tr.profile.reminderDenied);
    reloadMetrics();
  }

  async function doExport() {
    try {
      await shareFile(await exportAllData());
    } catch {
      Alert.alert(tr.profile.exportError);
    }
  }

  async function doImport() {
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (picked.canceled || !picked.result) return;
      const added = await importBackup(await picked.result.text());
      Alert.alert(tr.settings.importDone(added));
    } catch {
      Alert.alert(tr.settings.importError);
    }
  }

  function doDeleteAll() {
    confirm(tr.settings.deleteAllTitle, tr.settings.deleteAllBody, tr.settings.deleteAllOk, () =>
      confirm(tr.settings.deleteAllTitle2, tr.settings.deleteAllBody2, tr.settings.deleteAllOk, async () => {
        await deleteAllData();
        router.replace('/onboarding');
      }),
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Icon name="chevron-back" size={24} color={colors.accent} />
        <Text style={styles.backText}>{tr.settings.back}</Text>
      </Pressable>
      <Text style={styles.title}>{tr.settings.title}</Text>

      <ListSection title={tr.settings.profile}>
        <ListRow
          icon="person"
          tint={tint.amber}
          title={tr.settings.nickname}
          right={
            <TextInput
              value={nickValue}
              onChangeText={setNick}
              onEndEditing={saveNick}
              onSubmitEditing={saveNick}
              placeholder={tr.onboarding.nickPlaceholder}
              placeholderTextColor="#C4BEB6"
              autoCapitalize="none"
              returnKeyType="done"
              style={styles.input}
            />
          }
        />
        <ListRow
          icon="flag"
          tint={tint.sage}
          title={tr.settings.goal}
          value={profile ? tr.onboarding.goal[profile.goal] : '—'}
          chevron
          onPress={() =>
            profile &&
            choose(
              tr.settings.goal,
              GOALS.map((g) => ({ label: tr.onboarding.goal[g], value: g })),
              (g) => saveProfile({ ...profile, goal: g }),
            )
          }
        />
      </ListSection>

      <ListSection title={tr.settings.notifications} footer={tr.settings.reminderFooter}>
        <ListRow icon="notifications" tint={tint.cherry} title={tr.profile.reminder} toggle={!!metrics?.reminderEnabled} onToggle={toggleReminder} />
        <ListRow
          icon="time"
          tint={tint.slate}
          title={tr.settings.reminderTime}
          value={timeLabel(settings.reminderHour, settings.reminderMinute)}
          chevron
          onPress={() =>
            choose(
              tr.settings.reminderTime,
              REMINDER_TIMES.map(([h, m]) => ({ label: timeLabel(h, m), value: [h, m] as const })),
              async ([h, m]) => {
                await updateSettings({ reminderHour: h, reminderMinute: m });
                refreshReminder();
              },
            )
          }
        />
      </ListSection>

      <ListSection title={tr.settings.experience} footer={tr.settings.motionFooter}>
        <ListRow icon="phone-portrait" tint={tint.sky} title={tr.settings.haptics} toggle={settings.haptics} onToggle={(v) => updateSettings({ haptics: v })} />
        <ListRow icon="sparkles" tint={tint.espresso} title={tr.settings.reduceMotion} toggle={settings.reduceMotion} onToggle={(v) => updateSettings({ reduceMotion: v })} />
      </ListSection>

      <ListSection title={tr.settings.caffeine} footer={tr.settings.caffeineFooter}>
        <ListRow icon="flash" tint={tint.amber} title={tr.settings.showCaffeine} toggle={settings.showCaffeine} onToggle={(v) => updateSettings({ showCaffeine: v })} />
        <ListRow
          icon="speedometer"
          tint={tint.cherry}
          title={tr.settings.caffeineRef}
          value={`${settings.caffeineRef} mg`}
          chevron
          onPress={() =>
            choose(
              tr.settings.caffeineRef,
              CAFFEINE_REFS.map((v) => ({ label: `${v} mg`, value: v })),
              (v) => updateSettings({ caffeineRef: v }),
            )
          }
        />
      </ListSection>

      <ListSection title={tr.settings.data} footer={tr.settings.dataFooter}>
        <ListRow icon="share-outline" tint={tint.sage} title={tr.profile.export} chevron onPress={doExport} />
        <ListRow icon="download-outline" tint={tint.sky} title={tr.settings.import} chevron onPress={doImport} />
      </ListSection>

      <ListSection title={tr.settings.beta}>
        <ListRow icon="stats-chart" tint={tint.slate} title={tr.profile.testStats} chevron onPress={() => router.push('/stats')} />
      </ListSection>

      <ListSection title={tr.settings.about}>
        <ListRow icon="lock-closed" tint={tint.espresso} title={tr.settings.privacy} chevron onPress={() => router.push('/privacy')} />
        <ListRow icon="information-circle" tint={tint.slate} title={tr.settings.version} value={Constants.expoConfig?.version ?? '1.0.0'} />
      </ListSection>

      <ListSection>
        <ListRow title={tr.settings.deleteAll} destructive onPress={doDeleteAll} />
      </ListSection>

      <Text style={styles.signature}>{tr.settings.signature}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6 },
  backText: { fontSize: 17, color: colors.accent },
  title: { ...type.largeTitle, marginTop: 6, marginLeft: 4 },
  input: { ...type.body, color: colors.muted, textAlign: 'right', paddingVertical: 0 },
  signature: { ...type.footnote, textAlign: 'center', marginTop: 28 },
});
