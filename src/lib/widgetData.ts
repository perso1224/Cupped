import { addDays, dayKey, startOfDay } from './progress';
import type { CupEntry } from './types';

/**
 * Ana ekran widget'ının okuduğu özet (saf, testli). iPhone ve Android widget'ları aynı biçimi okur:
 * days: son 14 gün → [fincan, skor toplamı, en iyi skor]; streak: en son fincan gününde biten seri.
 * "Bugün" ve "bu hafta" widget'ın kendi saatiyle hesaplanır (uygulama açılmasa da gün dönünce doğru kalır).
 */
export type WidgetData = { v: 1; days: Record<string, [number, number, number]>; streak: number; streakDay: string | null };

export const WIDGET_DAYS = 14;

export function buildWidgetData(entries: CupEntry[], now: Date = new Date()): WidgetData {
  const from = addDays(startOfDay(now), -(WIDGET_DAYS - 1)).getTime();
  const days: WidgetData['days'] = {};
  const all = new Set<string>();
  let last: string | null = null;
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const k = dayKey(d);
    all.add(k);
    if (!last || k > last) last = k;
    if (d.getTime() < from) continue;
    const cur = days[k] ?? [0, 0, 0];
    days[k] = [cur[0] + 1, cur[1] + e.score, Math.max(cur[2], e.score)];
  }
  let streak = 0;
  if (last) {
    const [y, m, d] = last.split('-').map(Number);
    let cursor = new Date(y, m - 1, d);
    while (all.has(dayKey(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    }
  }
  return { v: 1, days, streak, streakDay: last };
}
