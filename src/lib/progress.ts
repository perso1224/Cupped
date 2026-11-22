import { BADGE_RULES, BADGES, WEEKLY, type Badge } from '../config/scoring.config';
import { computePalateTypeId, mostCommon } from './palate';
import { matchChain, normalizePlace, placeKey } from './scoring';
import type { CupEntry, Method, TasteNote } from './types';

// ---------- Tarih yardımcıları (telefonun yerel saatiyle) ----------

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Haftanın başlangıcı: Pazartesi 00:00. */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() + 6) % 7));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Dönem aralığı. offset 0 = bu hafta/ay, -1 = geçen hafta/ay. */
export function periodRange(kind: 'week' | 'month', offset: number, now: Date = new Date()): { start: Date; end: Date } {
  if (kind === 'week') {
    const start = addDays(startOfWeek(now), 7 * offset);
    return { start, end: addDays(start, 7) };
  }
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
}

export function inRange(e: Pick<CupEntry, 'createdAt'>, start: Date, end: Date): boolean {
  const t = new Date(e.createdAt).getTime();
  return t >= start.getTime() && t < end.getTime();
}

const byDate = (a: CupEntry, b: CupEntry) => a.createdAt.localeCompare(b.createdAt);

/** Skorla aynı mekan kimliği: zincir şubeleri tek mekan, Latin dışı adlar da boş anahtar olmaz. */
const placeKeyOf = (e: CupEntry): string | null => placeKey(e);

/** Detay modu kullanılmış mı? (tat notu, menşei, tarif ya da not) */
export function isDetailed(e: Pick<CupEntry, 'notes' | 'origin' | 'brew' | 'note'>): boolean {
  const b = e.brew;
  return (
    e.notes.length > 0 ||
    !!(e.origin && e.origin.trim()) ||
    !!(b && (b.doseG || b.waterMl || b.grind)) ||
    !!(e.note && e.note.trim())
  );
}

/** Kahve:su oranı, ör. 15 g / 250 ml → "1:16.7" yerine yuvarlanmış "1:17". */
export function brewRatio(doseG: number | null | undefined, waterMl: number | null | undefined): string | null {
  if (!doseG || !waterMl || doseG <= 0 || waterMl <= 0) return null;
  return `1:${Math.round(waterMl / doseG)}`;
}

// ---------- Seri ve haftalık şerit ----------

/** Bugün (ya da henüz bugün kayıt yoksa dün) biten, üst üste fincanlı gün sayısı. */
export function currentStreak(entries: CupEntry[], today: Date = new Date()): number {
  const days = new Set(entries.map((e) => dayKey(new Date(e.createdAt))));
  let cursor = startOfDay(today);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export type StripDay = { date: Date; key: string; best: number | null; isToday: boolean; isFuture: boolean };

/** Bu haftanın 7 günü (Pzt-Paz), her gün için en yüksek skor. */
export function weekStrip(entries: CupEntry[], today: Date = new Date()): StripDay[] {
  const start = startOfWeek(today);
  const todayKey = dayKey(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const key = dayKey(date);
    const scores = entries.filter((e) => dayKey(new Date(e.createdAt)) === key).map((e) => e.score);
    return {
      date,
      key,
      best: scores.length ? Math.max(...scores) : null,
      isToday: key === todayKey,
      isFuture: date.getTime() > startOfDay(today).getTime(),
    };
  });
}

// ---------- Haftalık Damak Skoru ----------

export function weeklyPalateScore(weekEntries: CupEntry[]): number {
  const methods = new Set(weekEntries.map((e) => e.method)).size;
  const places = new Set(weekEntries.map(placeKeyOf).filter(Boolean)).size;
  const notes = new Set(weekEntries.flatMap((e) => e.notes)).size;
  const cups = Math.min(weekEntries.length, WEEKLY.maxCupsCounted);
  const raw = methods * WEEKLY.perMethod + places * WEEKLY.perPlace + notes * WEEKLY.perNote + cups * WEEKLY.perCup;
  return Math.min(WEEKLY.max, raw);
}

/** Bu haftadan önceki haftaların en yüksek Haftalık Damak Skoru (rekor). */
export function weeklyRecordBefore(entries: CupEntry[], weekStart: Date): number {
  const groups = new Map<string, CupEntry[]>();
  for (const e of entries) {
    const ws = startOfWeek(new Date(e.createdAt));
    if (ws.getTime() >= weekStart.getTime()) continue;
    const k = dayKey(ws);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  let best = 0;
  for (const list of groups.values()) best = Math.max(best, weeklyPalateScore(list));
  return best;
}

/** Dönem içindeki keşifler: ilk kez gidilen mekanlar ve ilk kez denenen yöntemler. */
export function discoveriesIn(entries: CupEntry[], start: Date, end: Date): { places: string[]; methods: Method[] } {
  const seenPlaces = new Set<string>();
  const seenMethods = new Set<Method>();
  const places: string[] = [];
  const methods: Method[] = [];
  for (const e of [...entries].sort(byDate)) {
    const key = placeKeyOf(e);
    const inside = inRange(e, start, end);
    if (key && !seenPlaces.has(key)) {
      seenPlaces.add(key);
      if (inside) places.push(e.placeName!);
    }
    if (!seenMethods.has(e.method)) {
      seenMethods.add(e.method);
      if (inside) methods.push(e.method);
    }
  }
  return { places, methods };
}

// ---------- Haftalık / aylık rapor ----------

export type PeriodReport = {
  start: Date;
  end: Date;
  cups: number;
  avg: number;
  best: CupEntry | null;
  places: number;
  methods: number;
  newPlaces: number;
  topMethod: Method | null;
  palateTypeId: string | null;
  palateScore: number;
};

export function periodReport(entries: CupEntry[], start: Date, end: Date): PeriodReport {
  const list = entries.filter((e) => inRange(e, start, end)).sort(byDate);
  const counts = new Map<Method, number>();
  for (const e of list) counts.set(e.method, (counts.get(e.method) ?? 0) + 1);
  const topMethod = list.length ? mostCommon(list.map((e) => e.method))[0] : null;
  return {
    start,
    end,
    cups: list.length,
    avg: list.length ? Math.round(list.reduce((s, e) => s + e.score, 0) / list.length) : 0,
    best: list.reduce<CupEntry | null>((b, e) => (!b || e.score > b.score ? e : b), null),
    places: new Set(list.map(placeKeyOf).filter(Boolean)).size,
    methods: counts.size,
    newPlaces: discoveriesIn(entries, start, end).places.length,
    topMethod,
    palateTypeId: list.length ? computePalateTypeId(list, { wholePeriod: true }) : null,
    palateScore: weeklyPalateScore(list),
  };
}

// ---------- Damak Pasaportu ----------

export type PassportPlace = { key: string; name: string; visits: number; firstVisit: string };

export type Passport = {
  methods: Method[];
  places: PassportPlace[];
  palateTypeIds: string[];
  badges: Badge[];
};

export function passport(entries: CupEntry[]): Passport {
  const sorted = [...entries].sort(byDate);
  const methods = [...new Set(sorted.map((e) => e.method))];
  const places = new Map<string, PassportPlace>();
  for (const e of sorted) {
    const key = placeKeyOf(e);
    if (!key) continue;
    const p = places.get(key);
    if (p) p.visits++;
    else places.set(key, { key, name: matchChain(e.placeName!) ?? e.placeName!, visits: 1, firstVisit: e.createdAt });
  }
  return {
    methods,
    places: [...places.values()].sort((a, b) => b.visits - a.visits || a.firstVisit.localeCompare(b.firstVisit)),
    palateTypeIds: [...new Set(sorted.map((e) => e.palateTypeId))],
    badges: earnedBadges(sorted),
  };
}

export type BadgeProgress = { badge: Badge; current: number; target: number; earned: boolean };

/** Her rozet için ilerleme (ör. 2/5). Kilitli rozetler hedef gösterebilsin diye. */
export function badgeProgress(entries: CupEntry[]): BadgeProgress[] {
  const sorted = [...entries].sort(byDate);
  const best = new Map<string, number>();
  const bump = (id: string, v: number) => best.set(id, Math.max(best.get(id) ?? 0, v));

  // Sadık Fincan: art arda N gün, her gün en az bir kez AYNI yöntem (o gün başka kahve de içilebilir)
  const dayMethods = new Map<string, Set<Method>>();
  for (const e of sorted) {
    const k = dayKey(new Date(e.createdAt));
    dayMethods.set(k, (dayMethods.get(k) ?? new Set()).add(e.method));
  }
  const days = [...dayMethods.keys()].sort();
  for (const m of new Set(sorted.map((e) => e.method))) {
    let run = 0;
    let prev: string | null = null;
    for (const k of days) {
      if (!dayMethods.get(k)!.has(m)) {
        run = 0;
        prev = k;
        continue;
      }
      const consecutive = prev !== null && dayKey(addDays(new Date(`${prev}T00:00:00`), 1)) === k;
      run = consecutive && run > 0 ? run + 1 : 1;
      prev = k;
      bump('routine', run);
    }
  }

  // Kafe Kaşifi
  bump('third_wave_refugee', new Set(sorted.filter((e) => e.venueKind === 'independent').map(placeKeyOf).filter(Boolean)).size);

  // Müdavim: aynı zincire art arda N ziyaret (en uzun seri)
  let chainRun = 0;
  let lastChain: string | null = null;
  for (const e of sorted) {
    const chain = e.venueKind === 'chain' && e.placeName ? matchChain(e.placeName) : null;
    chainRun = chain && chain === lastChain ? chainRun + 1 : chain ? 1 : 0;
    lastChain = chain;
    bump('chain_loyal', chainRun);
  }

  // Ev Baristası
  bump('pourover_patience', sorted.filter((e) => e.method === 'filter' && e.venueKind === 'home').length);

  // Geisha Anı
  bump('first_geisha', sorted.some((e) => e.origin && normalizePlace(e.origin).includes('geisha')) ? 1 : 0);

  // Şehir Gezgini (en iyi ay)
  const seen = new Set<string>();
  const perMonth = new Map<string, number>();
  for (const e of sorted) {
    const key = placeKeyOf(e);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const d = new Date(e.createdAt);
    const month = `${d.getFullYear()}-${d.getMonth()}`;
    perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
    bump('five_new_month', perMonth.get(month)!);
  }

  // Derinlik
  bump('depth', sorted.filter(isDetailed).length);

  // Yeni rozetler (22 Kas)
  bump('first_turkish', sorted.some((e) => e.method === 'turkish') ? 1 : 0);
  bump('first_coldbrew', sorted.some((e) => e.method === 'coldbrew') ? 1 : 0);
  bump('ten_places', new Set(sorted.map(placeKeyOf).filter(Boolean)).size);
  bump('streak30', longestStreak(sorted));
  bump('hundred_cups', sorted.length);

  const targets: Record<string, number> = {
    routine: BADGE_RULES.routineDays,
    third_wave_refugee: BADGE_RULES.independentPlaces,
    chain_loyal: BADGE_RULES.chainStreak,
    pourover_patience: BADGE_RULES.homeFilters,
    first_geisha: 1,
    five_new_month: BADGE_RULES.newPlacesInMonth,
    depth: BADGE_RULES.detailedCups,
    first_turkish: 1,
    first_coldbrew: 1,
    ten_places: BADGE_RULES.places,
    streak30: BADGE_RULES.streakDays,
    hundred_cups: BADGE_RULES.cups,
  };
  return BADGES.map((badge) => {
    const target = targets[badge.id] ?? 1;
    const current = Math.min(best.get(badge.id) ?? 0, target);
    return { badge, current, target, earned: current >= target };
  });
}

export function earnedBadges(entries: CupEntry[]): Badge[] {
  return badgeProgress(entries)
    .filter((p) => p.earned)
    .map((p) => p.badge);
}

// ---------- Profil / Damak Kartı özeti ----------

export type ProfileSummary = {
  cups: number;
  avg: number;
  places: number;
  methods: number;
  streak: number;
  palateTypeId: string | null;
};

export function profileSummary(entries: CupEntry[], today: Date = new Date()): ProfileSummary {
  return {
    cups: entries.length,
    avg: entries.length ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length) : 0,
    places: new Set(entries.map(placeKeyOf).filter(Boolean)).size,
    methods: new Set(entries.map((e) => e.method)).size,
    streak: currentStreak(entries, today),
    palateTypeId: entries.length ? computePalateTypeId(entries) : null,
  };
}

/** "Tüm fincanlar" filtresi: bir mekan (placeKey) ya da yöntem. */
export function filterEntries(entries: CupEntry[], f: { place?: string; method?: Method }): CupEntry[] {
  return entries.filter((e) => (!f.place || placeKeyOf(e) === f.place) && (!f.method || e.method === f.method));
}

export type MethodStat = { method: Method; cups: number; avg: number; lastAt: string | null };

/** Her demleme yöntemi için fincan sayısı, ortalama skor ve son fincan tarihi (Koleksiyon > Yöntemler). */
export function methodStats(entries: CupEntry[], methods: readonly Method[]): MethodStat[] {
  return methods.map((method) => {
    const list = entries.filter((e) => e.method === method);
    const avg = list.length ? Math.round(list.reduce((s, e) => s + e.score, 0) / list.length) : 0;
    const lastAt = list.reduce<string | null>((m, e) => (m === null || e.createdAt > m ? e.createdAt : m), null);
    return { method, cups: list.length, avg, lastAt };
  });
}

export type TrendRange = '1m' | '3m' | '1y' | 'all';
export type TrendPoint = { t: number; avg: number };
export type ScoreTrend = { points: TrendPoint[]; change: number | null };

/**
 * İlerleme grafiği: seçilen aralıkta skorun gidişatı.
 * 1A/3A: gün başına ortalama; 1Y/Tümü: hafta başına ortalama (nokta sayısı makul kalsın).
 * change: aralığın ikinci yarısının ortalaması − ilk yarısının ortalaması (en az 2 nokta gerekir).
 */
export function scoreTrend(entries: CupEntry[], range: TrendRange, now: Date = new Date()): ScoreTrend {
  const end = addDays(startOfDay(now), 1);
  const days = range === '1m' ? 30 : range === '3m' ? 91 : range === '1y' ? 365 : null;
  const start = days ? addDays(end, -days) : null;
  const list = entries.filter((e) => !start || inRange(e, start, end)).filter((e) => new Date(e.createdAt) < end);
  const weekly = range === '1y' || range === 'all';
  const buckets = new Map<number, number[]>();
  for (const e of list) {
    const d = new Date(e.createdAt);
    const t = (weekly ? startOfWeek(d) : startOfDay(d)).getTime();
    buckets.set(t, [...(buckets.get(t) ?? []), e.score]);
  }
  const points = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, s]) => ({ t, avg: Math.round(s.reduce((x, y) => x + y, 0) / s.length) }));
  if (points.length < 2) return { points, change: null };
  const half = Math.floor(points.length / 2);
  const mean = (p: TrendPoint[]) => p.reduce((s, x) => s + x.avg, 0) / p.length;
  return { points, change: Math.round(mean(points.slice(points.length - half)) - mean(points.slice(0, half))) };
}

/** Bu haftanın günleri: o gün fincan var mı (seri kartındaki işaretler). */
export function weekDots(entries: CupEntry[], today: Date = new Date()): { key: string; done: boolean; isToday: boolean; isFuture: boolean }[] {
  return weekStrip(entries, today).map((d) => ({ key: d.key, done: d.best !== null, isToday: d.isToday, isFuture: d.isFuture }));
}

/** Şimdiye kadarki en uzun seri (art arda fincan eklenen gün sayısı). */
export function longestStreak(entries: CupEntry[]): number {
  const days = [...new Set(entries.map((e) => dayKey(new Date(e.createdAt))))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of days) {
    run = prev !== null && dayKey(addDays(new Date(`${prev}T00:00:00`), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export type NoteShare = { note: TasteNote; count: number; pct: number };

/** Tat notlarının dağılımı (damak haritası): en sık olandan, yüzdeler toplam not sayısına göre. */
export function noteShares(entries: CupEntry[]): NoteShare[] {
  const counts = new Map<TasteNote, number>();
  for (const e of entries) for (const n of e.notes ?? []) counts.set(n, (counts.get(n) ?? 0) + 1);
  const total = [...counts.values()].reduce((s, x) => s + x, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([note, count]) => ({ note, count, pct: Math.round((count / total) * 100) }));
}

export type Favorites = { place: string | null; method: Method | null; origin: string | null; hour: number | null; part: DayPart | null; loved: { name: string; avg: number } | null };

/** Favorilerin: en sık mekan, yöntem, çekirdek (menşei metninin ilk parçası) ve kahve saati. */
export function favorites(entries: CupEntry[]): Favorites {
  if (!entries.length) return { place: null, method: null, origin: null, hour: null, part: null, loved: null };
  const sorted = [...entries].sort(byDate);
  const p = passport(sorted).places[0];
  const origins = sorted.map((e) => e.origin?.split(' · ')[0]?.trim()).filter((o): o is string => !!o);
  const time = coffeeTime(sorted);
  return {
    place: p ? p.name : null,
    method: mostCommon(sorted.map((e) => e.method))[0] ?? null,
    origin: origins.length ? mostCommon(origins)[0] : null,
    hour: time?.hour ?? null,
    part: time?.part ?? null,
    loved: lovedPlace(sorted),
  };
}

/** Mekan başına kişisel yıldız ortalaması (sadece yıldız verilen fincanlar). Anahtar: placeKey. */
export function placeRatings(entries: CupEntry[]): Map<string, { avg: number; count: number }> {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const e of entries) {
    const k = placeKeyOf(e);
    if (!k || !e.rating) continue;
    const cur = sums.get(k) ?? { sum: 0, count: 0 };
    sums.set(k, { sum: cur.sum + e.rating, count: cur.count + 1 });
  }
  return new Map([...sums].map(([k, v]) => [k, { avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count }]));
}

/** En sevdiğin mekan: yıldız ortalaması en yüksek olan; eşitlikte daha çok yıldız verilen. */
function lovedPlace(entries: CupEntry[]): { name: string; avg: number } | null {
  const r = placeRatings(entries);
  let best: { key: string; avg: number; count: number } | null = null;
  for (const [key, v] of r) if (!best || v.avg > best.avg || (v.avg === best.avg && v.count > best.count)) best = { key, ...v };
  if (!best) return null;
  const p = passport(entries).places.find((x) => x.key === best.key);
  return p ? { name: p.name, avg: best.avg } : null;
}

export type DayPart = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
export const DAY_PARTS: { key: DayPart; from: number; to: number }[] = [
  { key: 'morning', from: 5, to: 11 },
  { key: 'noon', from: 11, to: 14 },
  { key: 'afternoon', from: 14, to: 18 },
  { key: 'evening', from: 18, to: 24 },
  { key: 'night', from: 0, to: 5 },
];

/**
 * Kahve saati (uygulamanın her yerinde aynı hesap): en çok içilen gün dilimi ve o dilimdeki en sık saat.
 * Ana sayfa Favoriler kartı ve Öne Çıkanlar bunu kullanır; birbirini tutmayan mesaj çıkmaz.
 */
export function coffeeTime(entries: CupEntry[]): { part: DayPart; hour: number } | null {
  if (!entries.length) return null;
  const hours = entries.map((e) => new Date(e.createdAt).getHours());
  const counts = DAY_PARTS.map((p) => hours.filter((h) => h >= p.from && h < p.to).length);
  const i = counts.indexOf(Math.max(...counts));
  const inPart = hours.filter((h) => h >= DAY_PARTS[i].from && h < DAY_PARTS[i].to).map(String);
  return { part: DAY_PARTS[i].key, hour: Number(mostCommon(inPart)[0]) };
}
