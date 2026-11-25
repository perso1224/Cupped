import { CAFFEINE_MG } from '../config/scoring.config';
import { tr } from '../i18n/tr';
import { addDays, dayKey, startOfDay } from './progress';
import type { CupEntry } from './types';

/**
 * Ana ekran widget'larının okuduğu özet (saf, testli). iPhone ve Android widget'ları aynı biçimi okur:
 * - days: son 14 gün → [fincan, skor toplamı, en iyi skor, kafein mg]
 * - streak / streakDay: en son fincan gününde biten seri
 * - wall / wallEnd: Fincan Duvarı için son 182 günün yoğunluğu (0–3), wallEnd gününde biter
 * - last: son fincan (fotoğrafı ayrıca ortak alana kopyalanır)
 * "Bugün" ve "bu hafta" widget'ın kendi saatiyle hesaplanır (uygulama açılmasa da gün dönünce doğru kalır).
 */
export type WidgetLast = { at: string; score: number; method: string; rating: number | null; place: string | null };
export type WidgetData = {
  v: 2;
  days: Record<string, [number, number, number, number]>;
  streak: number;
  streakDay: string | null;
  wall: string;
  wallEnd: string;
  last: WidgetLast | null;
  caffeineRef: number;
};

export const WIDGET_DAYS = 14;
export const WALL_DAYS = 182;

export function buildWidgetData(entries: CupEntry[], now: Date = new Date(), caffeineRef = 400): WidgetData {
  const today = startOfDay(now);
  const from = addDays(today, -(WIDGET_DAYS - 1)).getTime();
  const days: WidgetData['days'] = {};
  const counts = new Map<string, number>();
  let last: CupEntry | null = null;
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const k = dayKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (!last || e.createdAt > last.createdAt) last = e;
    if (d.getTime() < from) continue;
    const cur = days[k] ?? [0, 0, 0, 0];
    days[k] = [cur[0] + 1, cur[1] + e.score, Math.max(cur[2], e.score), cur[3] + (CAFFEINE_MG[e.method] ?? 0)];
  }
  const lastDay = last ? dayKey(new Date(last.createdAt)) : null;
  let streak = 0;
  if (lastDay) {
    const [y, m, d] = lastDay.split('-').map(Number);
    let cursor = new Date(y, m - 1, d);
    while (counts.has(dayKey(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    }
  }
  let wall = '';
  for (let i = WALL_DAYS - 1; i >= 0; i--) wall += String(Math.min(3, counts.get(dayKey(addDays(today, -i))) ?? 0));
  return {
    v: 2,
    days,
    streak,
    streakDay: lastDay,
    wall,
    wallEnd: dayKey(today),
    last: last
      ? {
          at: last.createdAt,
          score: last.score,
          method: tr.methods[last.method] ?? last.method,
          rating: last.rating ?? null,
          place: last.placeName?.trim() || null,
        }
      : null,
    caffeineRef,
  };
}
