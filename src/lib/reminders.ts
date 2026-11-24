import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { CuppedWidget } from '../../modules/cupped-widget';
import { notificationPlan, parseTarget, targetHref, type NotifyTarget } from './notifyPlan';
import { buildWidgetData } from './widgetData';
import { loadEntries, loadMetrics, loadSettings, updateMetrics } from './storage';

/**
 * Bildirimler: telefonun kendi (yerel) bildirimleri, sunucu yok. Plan notifyPlan.ts'te (günlük hatırlatma,
 * seri tehlikede, haftalık/aylık özet, geri dön). Her açılışta ve kayıtta yeniden kurulur.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const REMINDER_ID = 'cupped-daily';
const CHANNEL_ID = 'reminders';

/** Android 8+ bildirimleri bir kanala bağlar; kullanıcı telefon ayarlarında "Hatırlatmalar" adıyla görür. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Hatırlatmalar',
    importance: AndroidImportance.DEFAULT,
  });
}
let chain: Promise<void> = Promise.resolve();

/**
 * Ayar açıksa bildirimi yeniden kurar; kapalıysa hepsini iptal eder. Hata verirse sessizce geçer.
 * Çağrılar sıraya girer: aynı anda gelen iki çağrı iki bildirim kurmasın.
 */
export function refreshReminder(): Promise<void> {
  chain = chain.then(doRefresh, doRefresh);
  return chain;
}

/** Tüm hatırlatmaları iptal eder (ör. "Tüm verileri sil"). */
export function cancelReminders(): Promise<void> {
  chain = chain.then(
    () => Notifications.cancelAllScheduledNotificationsAsync().catch(() => {}),
    () => Notifications.cancelAllScheduledNotificationsAsync().catch(() => {}),
  );
  return chain;
}

/** Ana ekran widget'ını güncel tutar (modül yoksa, ör. eski derleme ya da Expo Go: sessizce geçer). */
function syncWidget(entries: Awaited<ReturnType<typeof loadEntries>>): void {
  try {
    CuppedWidget?.setData(JSON.stringify(buildWidgetData(entries)));
  } catch {
    // widget güncellenemezse uygulama yine çalışır
  }
}

async function doRefresh(): Promise<void> {
  try {
    const entries = await loadEntries();
    syncWidget(entries);
    const m = await loadMetrics();
    await Notifications.cancelAllScheduledNotificationsAsync();
    const s = await loadSettings();
    const prefs = {
      daily: !!m.reminderEnabled,
      streak: s.notifyStreak,
      weekly: s.notifyWeekly,
      monthly: s.notifyMonthly,
      comeback: s.notifyComeback,
    };
    if (!Object.values(prefs).some(Boolean)) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await ensureAndroidChannel();
    const plan = notificationPlan(entries, prefs, new Date(), s.reminderHour, s.reminderMinute);
    for (const [i, r] of plan.entries()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_ID}-${r.kind}-${i}`,
        content: { title: r.title, body: r.body, data: { target: r.target satisfies NotifyTarget } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL_ID },
      });
    }
  } catch {
    // bildirim kurulamazsa uygulama yine çalışır
  }
}

/** Bildirim izni: varsa true; yoksa bir kez sorar. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Kullanıcı hatırlatmayı açar/kapatır. Açarken izin ister; izin verilmezse false döner. */
export async function setReminderEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    try {
      const cur = await Notifications.getPermissionsAsync();
      const perm = cur.granted ? cur : await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        await updateMetrics((m) => (m.reminderEnabled = false));
        return false;
      }
    } catch {
      return false;
    }
  }
  await updateMetrics((m) => (m.reminderEnabled = enabled));
  await refreshReminder();
  return true;
}

/**
 * Bildirime dokununca ilgili ekranı açar (yeni fincan, ana sayfa, haftalık/aylık özet).
 * Uygulama kapalıyken dokunulduysa açılış bitince (ready) gider. Aynı dokunuş iki kez işlenmez.
 */
export function useNotificationNavigation(ready: boolean): void {
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const open = (r: Notifications.NotificationResponse | null) => {
      if (!r || r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const key = `${r.notification.request.identifier}@${r.notification.date}`;
      if (handled.has(key)) return;
      handled.add(key);
      Notifications.clearLastNotificationResponse();
      const t = parseTarget(r.notification.request.content.data);
      if (!t || t.route === 'home') {
        router.navigate('/');
        return;
      }
      router.push(targetHref(t) as Parameters<typeof router.push>[0]);
    };
    let sub: { remove(): void } | undefined;
    try {
      open(Notifications.getLastNotificationResponse());
      sub = Notifications.addNotificationResponseReceivedListener(open);
    } catch {
      // bildirim modülü yoksa dokunuş yalnızca uygulamayı açar
    }
    return () => sub?.remove();
  }, [ready]);
}
const handled = new Set<string>();
