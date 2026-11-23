import { CAFFEINE_MG } from '../config/scoring.config';
import { addDays, coffeeTime, inRange, startOfWeek, type DayPart } from './progress';
import { matchChain, placeKey } from './scoring';
import type { CupEntry } from './types';

/** "Öne Çıkanlar" (Apple Sağlık'taki gibi): geçmişten otomatik çıkarılan kısa içgörüler. Saf, testli. */
export type Insight = { id: string; icon: 'trending-up' | 'trending-down' | 'remove' | 'time' | 'location' | 'flash' | 'calendar'; title: string; text: string };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const PART_LABEL: Record<DayPart, string> = {
  morning: 'sabahları',
  noon: 'öğle saatlerinde',
  afternoon: 'öğleden sonraları',
  evening: 'akşamları',
  night: 'gece yarısından sonra',
};
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
    const t = coffeeTime(entries)!; // ana sayfadaki Favoriler kartıyla aynı hesap
    out.push({ id: 'time', icon: 'time', title: 'Kahve saatin', text: `En çok ${PART_LABEL[t.part]} içiyorsun.` });
  }

  // 3) En sadık olunan mekan (en az 2 ziyaret)
  const places = new Map<string, { name: string; n: number }>();
  for (const e of entries) {
    if (!e.placeName || e.venueKind === 'home' || e.venueKind === 'office') continue;
    // Skor ve Favoriler kartıyla aynı mekan kimliği: zincirin şubeleri tek mekan sayılır
    const k = placeKey(e)!;
    const p = places.get(k);
    if (p) p.n++;
    else places.set(k, { name: matchChain(e.placeName) ?? e.placeName.trim(), n: 1 });
  }
  const top = [...places.values()].sort((a, b) => b.n - a.n)[0];
  if (top && top.n >= 2) {
    out.push({ id: 'place', icon: 'location', title: 'Favori mekanın', text: `${top.name}: ${top.n} ziyaret.` });
  }

  // 4) Haftalık kafein ortalaması (günlük)
  if (thisWeek.length) {
    // Uygulamayı hafta ortasında kullanmaya başlayan için ilk fincandan önceki günler ortalamayı düşürmesin
    const first = entries.reduce((m, e) => (e.createdAt < m ? e.createdAt : m), entries[0].createdAt);
    const firstDay = new Date(first);
    const from = firstDay > ws ? new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate()) : ws;
    const days = Math.max(1, Math.min(7, Math.floor((now.getTime() - from.getTime()) / 86_400_000) + 1));
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
