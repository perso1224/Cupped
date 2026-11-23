/** Fincan ne zaman içildi: unutulan fincan dün olarak da eklenebilsin (seri bozulmasın). */
export type When = 'now' | 'yesterday';

/** "Dün" = dün aynı saat (gün değişse de 24 saat öncesi). */
export function whenToDate(w: When, now: Date = new Date()): Date {
  if (w === 'now') return now;
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d;
}
