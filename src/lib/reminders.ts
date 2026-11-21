import * as Notifications from 'expo-notifications';
import { currentStreak, dayKey } from './progress';
import { nextReminder } from './reminderTime';
import { loadEntries, loadMetrics, loadSettings, updateMetrics } from './storage';

/**
 * Günlük hatırlatma: telefonun kendi (yerel) bildirimi, sunucu yok.
 * Her gün en fazla 1 kez, akşam 20:30'da; o gün fincan eklendiyse bir sonraki güne kayar.
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

async function doRefresh(): Promise<void> {
  try {
    const m = await loadMetrics();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!m.reminderEnabled) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const entries = await loadEntries();
    const days = new Set(entries.map((e) => dayKey(new Date(e.createdAt))));
    const s = await loadSettings();
    const r = nextReminder(days, currentStreak(entries), new Date(), s.reminderHour, s.reminderMinute);
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
    });
  } catch {
    // bildirim kurulamazsa uygulama yine çalışır
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
