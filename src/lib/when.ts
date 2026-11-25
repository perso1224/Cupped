/** Fincan ne zaman içildi: unutulan fincan son 7 günden birine de eklenebilsin (seri bozulmasın). */
export type When = 'now' | 'yesterday' | 2 | 3 | 4 | 5 | 6;
/** Kaç gün öncesine kadar geriye eklenebilir (dün dahil). */
export const BACKFILL_DAYS = [2, 3, 4, 5, 6] as const;

/** "Dün" = dün aynı saat; sayı = o kadar gün önce aynı saat. */
export function whenToDate(w: When, now: Date = new Date()): Date {
  if (w === 'now') return now;
  const d = new Date(now);
  d.setDate(d.getDate() - (w === 'yesterday' ? 1 : w));
  return d;
}
