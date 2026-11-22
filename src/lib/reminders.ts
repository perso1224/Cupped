import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { currentStreak, dayKey } from './progress';
import { reminderPlan } from './reminderTime';
import { loadEntries, loadMetrics, loadSettings, updateMetrics } from './storage';

/**
 * Günlük hatırlatma: telefonun kendi (yerel) bildirimi, sunucu yok.
 * Her gün en fazla 1 kez, ayarlanan saatte; o gün fincan eklendiyse bir sonraki güne kayar.
 * Uygulama açılmasa da hatırlatma kesilmesin diye sonraki 6 gün de kurulur (her açılışta yeniden hesaplanır).
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
    await ensureAndroidChannel();
    const plan = reminderPlan(days, currentStreak(entries), new Date(), s.reminderHour, s.reminderMinute);
    for (const [i, r] of plan.entries()) {
      await Notifications.scheduleNotificationAsync({
        identifier: i === 0 ? REMINDER_ID : `${REMINDER_ID}-${i}`,
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL_ID },
      });
    }
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
