import { tr } from '../i18n/tr';
import { addDays, currentStreak, dayKey, periodReport, startOfDay, startOfMonth, startOfWeek } from './progress';
import { reminderPlan } from './reminderTime';
import type { CupEntry } from './types';

/**
 * Telefonun kendi kurduğu bildirimlerin planı (saf, testli; sunucu yok).
 * Her açılışta ve her kayıtta yeniden kurulur: fincan eklenince o günün hatırlatmaları kendiliğinden düşer.
 */
export type NotifyKind = 'daily' | 'streak' | 'weekly' | 'monthly' | 'comeback';

/** Bildirime dokununca açılacak yer. Özetler dönem başlangıcını taşır (dokunma günü farklı olabilir). */
export type NotifyTarget = { route: 'new' } | { route: 'home' } | { route: 'wrapped'; period: 'week' | 'month'; start: string };

export type PlannedNotification = { kind: NotifyKind; at: Date; title: string; body: string; target: NotifyTarget };

export type NotifyPrefs = { daily: boolean; streak: boolean; weekly: boolean; monthly: boolean; comeback: boolean };

/** Seri uyarısı saati: gün bitmeden son çağrı. */
export const STREAK_HOUR = 22;
/** Haftalık özet: Pazar 19:00. Aylık özet: ayın 1'i 11:00. */
export const WEEKLY_HOUR = 19;
export const MONTHLY_HOUR = 11;
/** Uygulama açılmazsa bu günlerde birer kez "geri gel" mesajı. */
export const COMEBACK_DAYS = [3, 7, 14] as const;
const COMEBACK_HOUR = 18;
/** Bir günde en fazla bu kadar bildirim. */
export const MAX_PER_DAY = 2;

/** Aynı gün çakışınca hangisi kalır (küçük sayı önce). */
const PRIORITY: Record<NotifyKind, number> = { weekly: 0, monthly: 0, streak: 1, comeback: 2, daily: 3 };

function at(d: Date, hour: number, minute = 0): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute);
}

export function notificationPlan(
  entries: CupEntry[],
  prefs: NotifyPrefs,
  now: Date,
  hour: number,
  minute: number,
): PlannedNotification[] {
  const days = new Set(entries.map((e) => dayKey(new Date(e.createdAt))));
  const streak = currentStreak(entries, now);
  const cupToday = days.has(dayKey(now));
  const today = startOfDay(now);
  const out: PlannedNotification[] = [];

  if (prefs.daily) {
    for (const r of reminderPlan(days, streak, now, hour, minute))
      out.push({ kind: 'daily', at: r.at, title: r.title, body: r.body, target: { route: 'new' } });
  }

  // Seri tehlikede: seri en az 2 günse, gün biterken hâlâ fincan yoksa. Bugün eklendiyse yarın için kurulur
  // (yarın da eklenirse kayıt anında yeniden hesaplanıp yine bir gün kayar).
  // Günlük hatırlatma zaten 21:00 ve sonrasındaysa ikinci kez söylemeye gerek yok.
  const lateDaily = prefs.daily && hour >= 21;
  if (prefs.streak && streak >= 2 && !lateDaily) {
    const when = at(cupToday ? addDays(today, 1) : today, STREAK_HOUR);
    if (when.getTime() > now.getTime())
      out.push({ kind: 'streak', at: when, title: tr.notify.streakTitle, body: tr.notify.streakBody(streak), target: { route: 'new' } });
  }

  // Haftalık özet: bu Pazar (saati geçtiyse gelecek Pazar). O hafta hiç fincan yoksa gönderilmez.
  if (prefs.weekly) {
    let sunday = addDays(startOfWeek(now), 6);
    if (at(sunday, WEEKLY_HOUR).getTime() <= now.getTime()) sunday = addDays(sunday, 7);
    const start = startOfWeek(sunday);
    const r = periodReport(entries, start, addDays(start, 7));
    if (r.cups > 0)
      out.push({
        kind: 'weekly',
        at: at(sunday, WEEKLY_HOUR),
        title: tr.notify.weeklyTitle,
        body: tr.notify.weeklyBody(r.cups, r.avg, r.topMethod ? tr.methods[r.topMethod] : null),
        target: { route: 'wrapped', period: 'week', start: dayKey(start) },
      });
  }

  // Aylık özet: gelecek ayın 1'i, biten ayda fincan varsa. Ayın 1'inde saat 11'den önce yeniden kurulursa
  // (her açılışta plan baştan kurulur) biten ayın özeti bugün için yeniden kurulur, kaybolmaz.
  if (prefs.monthly) {
    const thisMonth = startOfMonth(now);
    const beforeSend = now.getTime() < at(thisMonth, MONTHLY_HOUR).getTime();
    const start = beforeSend ? new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1) : thisMonth;
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const r = periodReport(entries, start, next);
    if (r.cups > 0) {
      const month = start.toLocaleDateString('tr-TR', { month: 'long' });
      out.push({
        kind: 'monthly',
        at: at(next, MONTHLY_HOUR),
        title: tr.notify.monthlyTitle(month.charAt(0).toLocaleUpperCase('tr-TR') + month.slice(1)),
        body: tr.notify.monthlyBody(r.cups, r.best?.score ?? 0),
        target: { route: 'wrapped', period: 'month', start: dayKey(start) },
      });
    }
  }

  // Geri gel: uygulama 3, 7, 14 gün açılmazsa. O gün günlük hatırlatmanın yerine geçer.
  if (prefs.comeback && entries.length > 0) {
    for (const [i, n] of COMEBACK_DAYS.entries()) {
      const day = addDays(today, n);
      out.push({
        kind: 'comeback',
        at: prefs.daily ? at(day, hour, minute) : at(day, COMEBACK_HOUR),
        title: tr.notify.comebackTitle,
        body: tr.notify.comebackBody[i],
        target: { route: 'home' },
      });
    }
  }

  // Aynı gün: geri gel varsa günlük hatırlatma düşer; sonra günde en fazla MAX_PER_DAY, önceliğe göre.
  const comebackDays = new Set(out.filter((n) => n.kind === 'comeback').map((n) => dayKey(n.at)));
  const byDay = new Map<string, PlannedNotification[]>();
  for (const n of out) {
    if (n.kind === 'daily' && comebackDays.has(dayKey(n.at))) continue;
    const k = dayKey(n.at);
    byDay.set(k, [...(byDay.get(k) ?? []), n]);
  }
  const kept: PlannedNotification[] = [];
  for (const list of byDay.values()) kept.push(...list.sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind]).slice(0, MAX_PER_DAY));
  return kept.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Bildirime dokunulunca açılacak adres. Özetlerde dönem, dokunma gününe göre "kaç dönem önce" olarak çevrilir. */
export function targetHref(t: NotifyTarget, now: Date = new Date()): string {
  if (t.route === 'new') return '/new';
  if (t.route === 'home') return '/';
  const [y, m, d] = t.start.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  let offset: number;
  if (t.period === 'week') offset = Math.round((startOfWeek(start).getTime() - startOfWeek(now).getTime()) / (7 * 864e5));
  else offset = (start.getFullYear() - now.getFullYear()) * 12 + start.getMonth() - now.getMonth();
  // Özet ekranı yalnızca bu ve geçen dönemi gösterir; daha eski bir bildirime geç dokunulursa İlerleme açılır
  if (offset < -1) return '/progress';
  return `/wrapped?period=${t.period}&offset=${Math.min(0, offset)}`;
}

/** Bildirim verisinden hedefi güvenle okur (eski/bozuk veri → null). */
export function parseTarget(data: unknown): NotifyTarget | null {
  const t = (data && typeof data === 'object' ? (data as { target?: unknown }).target : null) as Partial<NotifyTarget> | null;
  if (!t || typeof t !== 'object') return null;
  if (t.route === 'new' || t.route === 'home') return { route: t.route };
  if (t.route === 'wrapped' && (t.period === 'week' || t.period === 'month') && typeof t.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.start))
    return { route: 'wrapped', period: t.period, start: t.start };
  return null;
}
