import { CAFFEINE_MG } from '../config/scoring.config';
import { addDays, inRange, startOfWeek } from './progress';
import { normalizePlace } from './scoring';
import type { CupEntry } from './types';

/** "Öne Çıkanlar" (Apple Sağlık'taki gibi): geçmişten otomatik çıkarılan kısa içgörüler. Saf, testli. */
export type Insight = { id: string; icon: 'trending-up' | 'trending-down' | 'remove' | 'time' | 'location' | 'flash' | 'calendar'; title: string; text: string };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const DAY_PARTS: { from: number; to: number; label: string }[] = [
  { from: 5, to: 11, label: 'sabahları' },
  { from: 11, to: 14, label: 'öğle saatlerinde' },
  { from: 14, to: 18, label: 'öğleden sonraları' },
  { from: 18, to: 24, label: 'akşamları' },
  { from: 0, to: 5, label: 'gece yarısından sonra' },
];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export function insights(entries: CupEntry[], now: Date = new Date()): Insight[] {
  const out: Insight[] = [];
  const ws = startOfWeek(now);
  const thisWeek = entries.filter((e) => inRange(e, ws, addDays(ws, 7)));
  const lastWeek = entries.filter((e) => inRange(e, addDays(ws, -7), ws));

  // 1) Bu hafta vs geçen hafta
  if (thisWeek.length && lastWeek.length) {
    const d = Math.round(avg(thisWeek.map((e) => e.score)) - avg(lastWeek.map((e) => e.score)));
    out.push({
      id: 'trend',
      icon: d > 0 ? 'trending-up' : d < 0 ? 'trending-down' : 'remove',
      title: 'Haftalık trend',
      text:
        d > 0
          ? `Bu hafta ortalaman geçen haftadan ${d} puan yüksek.`
          : d < 0
            ? `Bu hafta ortalaman geçen haftadan ${-d} puan düşük. Yeni bir yer denemeye ne dersin?`
            : 'Ortalaman geçen haftayla aynı. İstikrar da bir yetenek.',
    });
  }

  // 2) En sık içilen gün dilimi (en az 4 fincan)
  if (entries.length >= 4) {
    const counts = DAY_PARTS.map((p) => entries.filter((e) => {
      const h = new Date(e.createdAt).getHours();
      return h >= p.from && h < p.to;
    }).length);
    const i = counts.indexOf(Math.max(...counts));
    out.push({ id: 'time', icon: 'time', title: 'Kahve saatin', text: `En çok ${DAY_PARTS[i].label} içiyorsun.` });
  }

  // 3) En sadık olunan mekan (en az 2 ziyaret)
  const places = new Map<string, { name: string; n: number }>();
  for (const e of entries) {
    if (!e.placeName || e.venueKind === 'home' || e.venueKind === 'office') continue;
    const k = normalizePlace(e.placeName);
    const p = places.get(k);
    if (p) p.n++;
    else places.set(k, { name: e.placeName.trim(), n: 1 });
  }
  const top = [...places.values()].sort((a, b) => b.n - a.n)[0];
  if (top && top.n >= 2) {
    out.push({ id: 'place', icon: 'location', title: 'Favori mekanın', text: `${top.name}: ${top.n} ziyaret.` });
  }

  // 4) Haftalık kafein ortalaması (günlük)
  if (thisWeek.length) {
    const days = Math.max(1, Math.min(7, Math.floor((now.getTime() - ws.getTime()) / 86_400_000) + 1));
    const mg = Math.round(thisWeek.reduce((s, e) => s + CAFFEINE_MG[e.method], 0) / days);
    out.push({ id: 'caffeine', icon: 'flash', title: 'Kafein', text: `Bu hafta günde ortalama ~${mg} mg.` });
  }

  // 5) En yüksek skorların günü (en az 7 fincan)
  if (entries.length >= 7) {
    const byDay = WEEKDAYS.map((_, d) => entries.filter((e) => new Date(e.createdAt).getDay() === d).map((e) => e.score));
    const best = byDay.map((xs) => (xs.length >= 2 ? avg(xs) : -1));
    const d = best.indexOf(Math.max(...best));
    if (best[d] > 0) out.push({ id: 'day', icon: 'calendar', title: 'En iyi günün', text: `En yüksek skorların ${WEEKDAYS[d]} günleri.` });
  }

  return out;
}
