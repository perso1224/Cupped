import Constants from 'expo-constants';
import { BackSpacer, FloatingBack } from '../components/NavButtons';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChoice } from '../components/ChoiceSheet';
import { ListRow, ListSection } from '../components/List';
import { tr } from '../i18n/tr';
import { IS_STORE_BUILD } from '../lib/build';
import { safely } from '../lib/safe';
import type { PalateGoal } from '../lib/onboarding';
import { cancelReminders, refreshReminder, setReminderEnabled } from '../lib/reminders';
import { CAFFEINE_REFS, REMINDER_TIMES, timeLabel } from '../lib/settings';
import { shareFile } from '../lib/share';
import { deleteAllData, exportAllData, importBackup, saveProfile, setReturnRoute, updateMetrics, updateSettings } from '../lib/storage';
import { useMetrics } from '../lib/useMetrics';
import { useProfile } from '../lib/useProfile';
import { useSettings } from '../lib/useSettings';
import { colors, saveThemePref, themePref, tint, type, layout } from '../theme';

const GOALS: PalateGoal[] = ['explore', 'brew', 'taste', 'log'];

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

/** Gizli deneme bölümü bu açılışta açıldı mı (ekrandan çıkıp girince kapanmasın). */
let betaUnlocked = false;

/** Sürüm + yüklü anlık güncellemenin tarihi (hangi güncellemenin telefonda olduğu görülsün). */
function versionLabel(): string {
  const v = Constants.expoConfig?.version ?? '1.0.0';
  const at = Updates.isEmbeddedLaunch ? null : Updates.createdAt;
  if (!at) return `${v} · ${tr.settings.updateEmbedded}`;
  return `${v} · ${at.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${at.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [beta, setBeta] = useState(betaUnlocked);
  const versionTaps = useRef(0);
  // iPhone'da sistem penceresi; Android'de alttan liste (4-5 seçenek sığsın)
  const [choose, choiceSheet] = useChoice();
  const settings = useSettings();
  const profile = useProfile();
  const [metrics, reloadMetrics] = useMetrics();
  const [nick, setNick] = useState<string | null>(null);
  const nickValue = nick ?? profile?.nickname ?? '';

  async function saveNick() {
    if (!profile || nick === null) return;
    const clean = nick.trim().replace(/^@+/, '').slice(0, 24);
    setNick(null);
    if (clean !== profile.nickname) await saveProfile({ ...profile, nickname: clean });
  }

  // Geri'ye klavye açıkken basılsa da takma ad kaybolmasın
  const latest = useRef({ saveNick });
  useEffect(() => {
    latest.current.saveNick = saveNick;
  });
  useEffect(() => () => void latest.current.saveNick(), []);

  async function toggleReminder(v: boolean) {
    const ok = await setReminderEnabled(v);
    if (v && !ok) Alert.alert(tr.profile.reminderDenied);
    else if (v) Alert.alert(tr.profile.reminderOn(timeLabel(settings.reminderHour, settings.reminderMinute)));
    reloadMetrics();
  }

  async function doExport() {
    const r = await safely(async () => {
      if (!(await shareFile(await exportAllData()))) return;
      await updateMetrics((m) => {
        m.lastBackupAt = new Date().toISOString();
      });
      reloadMetrics();
    });
    if (!r.ok) Alert.alert(tr.profile.exportError);
  }

  async function doImport() {
    const r = await safely(async () => {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (picked.canceled || !picked.result) return null;
      return importBackup(await picked.result.text());
    });
    if (!r.ok) {
      Alert.alert(tr.settings.importError);
      return;
    }
    if (r.value === null) return; // vazgeçildi
    refreshReminder();
    Alert.alert(tr.settings.importDone(r.value));
  }

  function doDeleteAll() {
    confirm(tr.settings.deleteAllTitle, tr.settings.deleteAllBody, tr.settings.deleteAllOk, () =>
      confirm(tr.settings.deleteAllTitle2, tr.settings.deleteAllBody2, tr.settings.deleteAllOk, async () => {
        const r = await safely(async () => {
          await deleteAllData();
          await cancelReminders(); // gezinme kendiliğinden tanıtıma geçer
        });
        if (!r.ok) Alert.alert(tr.settings.deleteAllError);
      }),
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + layout.topPad, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <BackSpacer />
      <Text accessibilityRole="header" style={styles.title}>{tr.settings.title}</Text>

      <ListSection title={tr.settings.profile}>
        <ListRow
          icon="person"
          tint={tint.amber}
          title={tr.settings.nickname}
          right={
            <TextInput
            maxFontSizeMultiplier={1.4}
              value={nickValue}
              onChangeText={setNick}
              onEndEditing={saveNick}
              onSubmitEditing={saveNick}
              maxLength={24}
              accessibilityLabel={tr.settings.nickname}
              // Başlıkla aynı yazı ("Takma ad") dolu bir değer gibi görünüyordu
              placeholder={tr.settings.nickAdd}
              placeholderTextColor={colors.muted}
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
              profile.goal,
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
            {
              const opts = REMINDER_TIMES.map(([h, m]) => ({ label: timeLabel(h, m), value: [h, m] as const }));
              choose(
                tr.settings.reminderTime,
                opts,
                async ([h, m]) => {
                  await updateSettings({ reminderHour: h, reminderMinute: m });
                  refreshReminder();
                },
                opts.find((o) => o.value[0] === settings.reminderHour && o.value[1] === settings.reminderMinute)?.value,
              );
            }
          }
        />
      </ListSection>

      <ListSection title={tr.settings.appearance} footer={themePref === 'system' ? tr.settings.appearanceFooter : tr.settings.appearanceFixed}>
        <ListRow
          icon="contrast"
          tint={tint.slate}
          title={tr.settings.theme}
          value={tr.settings.themes[themePref]}
          chevron
          onPress={() =>
            choose(
              tr.settings.theme,
              (['system', 'light', 'dark'] as const).map((t) => ({ label: tr.settings.themes[t], value: t })),
              (t) => {
                if (t === themePref) return;
                // Renkler uygulama açılırken seçilir: hemen yeniden yüklenir. Önce yazılan takma ad kaydedilir ve
                // yeniden açılınca bu ekrana dönülür (kullanıcı nerede kaldığını kaybetmesin).
                saveNick()
                  .then(() => saveThemePref(t))
                  .then(() => setReturnRoute('/settings'))
                  .then(() => Updates.reloadAsync())
                  .catch(() => Alert.alert(tr.settings.themeRestart));
              },
              themePref,
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
              settings.caffeineRef,
            )
          }
        />
      </ListSection>

      <ListSection
        title={tr.settings.data}
        footer={`${metrics?.lastBackupAt ? tr.settings.lastBackup(new Date(metrics.lastBackupAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })) : tr.settings.noBackup} ${tr.settings.dataFooter}`}
      >
        <ListRow icon="share-outline" tint={tint.sage} title={tr.profile.export} chevron onPress={doExport} />
        <ListRow icon="download-outline" tint={tint.sky} title={tr.settings.import} chevron onPress={doImport} />
      </ListSection>

      {/* Deneme bölümü normal kullanıcıdan gizli: Sürüm satırına 5 kez dokununca açılır (uygulama açık kaldıkça) */}
      {beta ? (
        <ListSection title={tr.settings.beta}>
          <ListRow icon="stats-chart" tint={tint.slate} title={tr.profile.testStats} chevron onPress={() => router.push('/stats')} />
        </ListSection>
      ) : null}

      <ListSection title={tr.settings.about}>
        <ListRow icon="lock-closed" tint={tint.espresso} title={tr.settings.privacy} chevron onPress={() => router.push('/privacy')} />
        <ListRow
          icon="information-circle"
          tint={tint.slate}
          title={tr.settings.version}
          value={versionLabel()}
          onPress={() => {
            versionTaps.current += 1;
            // Mağaza sürümünde deneme bölümü hiç açılmaz
            if (versionTaps.current >= 5 && !beta && !IS_STORE_BUILD) {
              betaUnlocked = true;
              setBeta(true);
            }
          }}
        />
      </ListSection>

      <ListSection>
        <ListRow title={tr.settings.deleteAll} destructive onPress={doDeleteAll} />
      </ListSection>

      <Text style={styles.signature}>{tr.settings.signature}</Text>
    </ScrollView>
    {choiceSheet}
    <FloatingBack label={tr.profile.title} left={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6 },
  backText: { fontSize: 17, color: colors.accent },
  title: { ...type.largeTitle, marginTop: 6, marginLeft: 4 },
  input: { ...type.body, color: colors.muted, textAlign: 'right', paddingVertical: 0 },
  signature: { ...type.footnote, textAlign: 'center', marginTop: 28 },
});
