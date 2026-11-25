import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { CuppedWidget } from '../../modules/cupped-widget';
import { notificationPlan, parseTarget, targetHref, type NotifyTarget } from './notifyPlan';
import { DEFAULT_SETTINGS } from './settings';
import { buildWidgetData } from './widgetData';
import { loadEntries, loadMetrics, loadSettings, photoUrl, updateMetrics } from './storage';

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

/** Tüm hatırlatmaları iptal eder ve widget'ları boşaltır (ör. "Tüm verileri sil": eski fotoğraf/seri kalmasın). */
export function cancelReminders(): Promise<void> {
  const clear = () => {
    syncWidget([], DEFAULT_SETTINGS.caffeineRef);
    return Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  };
  chain = chain.then(clear, clear);
  return chain;
}

/** Ana ekran widget'larını güncel tutar (modül yoksa, ör. eski derleme ya da Expo Go: sessizce geçer). */
let lastWidgetPhoto: string | null | undefined;
function syncWidget(entries: Awaited<ReturnType<typeof loadEntries>>, caffeineRef: number): void {
  if (!CuppedWidget) return;
  try {
    // Önce fotoğraf, sonra veri (veri yazılınca widget'lar yenilenir)
    const last = entries.reduce<(typeof entries)[number] | null>((m, e) => (!m || e.createdAt > m.createdAt ? e : m), null);
    const photo = last?.photoUri ?? null;
    // Tam boy (≈1080 px): widget kendisi küçültür; küçük kopya (240 px) orta boy widget'ta bulanık kalıyordu.
    // Kopyalama başarısızsa bir sonraki yenilemede tekrar denenir.
    if (CuppedWidget.setImage && photo !== lastWidgetPhoto) {
      if (CuppedWidget.setImage(photoUrl(photo))) lastWidgetPhoto = photo;
    }
    CuppedWidget.setData(JSON.stringify(buildWidgetData(entries, new Date(), caffeineRef)));
  } catch {
    // widget güncellenemezse uygulama yine çalışır
  }
}

async function doRefresh(): Promise<void> {
  try {
    const entries = await loadEntries();
    const s = await loadSettings();
    syncWidget(entries, s.caffeineRef);
    const m = await loadMetrics();
    await Notifications.cancelAllScheduledNotificationsAsync();
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
    // Android 13+: izin penceresi, en az bir bildirim kanalı varken gösterilir
    await ensureAndroidChannel();
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
      await ensureAndroidChannel(); // Android 13+: izin penceresi için önce kanal
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
