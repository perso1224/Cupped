import { BADGE_RULES, BADGES, WEEKLY, type Badge } from '../config/scoring.config';
import { computePalateTypeId } from './palate';
import { matchChain, normalizePlace } from './scoring';
import type { CupEntry, Method } from './types';

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

function placeKeyOf(e: CupEntry): string | null {
  if (!e.placeName || e.venueKind === 'home' || e.venueKind === 'office') return null;
  return normalizePlace(e.placeName);
}

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
  const topMethod = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
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
    palateTypeId: list.length ? computePalateTypeId(list) : null,
    palateScore: weeklyPalateScore(list),
  };
}

// ---------- Damak Pasaportu ----------

export type PassportPlace = { name: string; visits: number; firstVisit: string };

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
    else places.set(key, { name: e.placeName!, visits: 1, firstVisit: e.createdAt });
  }
  return {
    methods,
    places: [...places.values()].sort((a, b) => b.visits - a.visits || a.firstVisit.localeCompare(b.firstVisit)),
    palateTypeIds: [...new Set(sorted.map((e) => e.palateTypeId))],
    badges: earnedBadges(sorted),
  };
}

export function earnedBadges(entries: CupEntry[]): Badge[] {
  const sorted = [...entries].sort(byDate);
  const earned = new Set<string>();

  // Rutine Saplandın: art arda N gün, her gün tek ve aynı yöntem
  const dayMethods = new Map<string, Set<Method>>();
  for (const e of sorted) {
    const k = dayKey(new Date(e.createdAt));
    dayMethods.set(k, (dayMethods.get(k) ?? new Set()).add(e.method));
  }
  let run = 0;
  let prevKey: string | null = null;
  let prevMethod: Method | null = null;
  for (const [k, set] of [...dayMethods.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const only = set.size === 1 ? [...set][0] : null;
    const consecutive = prevKey !== null && dayKey(addDays(new Date(`${prevKey}T00:00:00`), 1)) === k;
    run = only && consecutive && only === prevMethod ? run + 1 : only ? 1 : 0;
    prevKey = k;
    prevMethod = only;
    if (run >= BADGE_RULES.routineDays) earned.add('routine');
  }

  // Üçüncü Dalga Mülteci
  const indep = new Set(sorted.filter((e) => e.venueKind === 'independent').map(placeKeyOf).filter(Boolean));
  if (indep.size >= BADGE_RULES.independentPlaces) earned.add('third_wave_refugee');

  // Zincir Sadıkı: aynı zincire art arda N ziyaret
  let chainRun = 0;
  let lastChain: string | null = null;
  for (const e of sorted) {
    const chain = e.venueKind === 'chain' && e.placeName ? matchChain(e.placeName) : null;
    chainRun = chain && chain === lastChain ? chainRun + 1 : chain ? 1 : 0;
    lastChain = chain;
    if (chainRun >= BADGE_RULES.chainStreak) earned.add('chain_loyal');
  }

  // Pour-over Sabrı
  if (sorted.filter((e) => e.method === 'filter' && e.venueKind === 'home').length >= BADGE_RULES.homeFilters) {
    earned.add('pourover_patience');
  }

  // İlk Geisha
  if (sorted.some((e) => e.origin && normalizePlace(e.origin).includes('geisha'))) earned.add('first_geisha');

  // Ayda 5 Yeni Mekan
  const seen = new Set<string>();
  const perMonth = new Map<string, number>();
  for (const e of sorted) {
    const key = placeKeyOf(e);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const d = new Date(e.createdAt);
    const month = `${d.getFullYear()}-${d.getMonth()}`;
    perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
  }
  if ([...perMonth.values()].some((n) => n >= BADGE_RULES.newPlacesInMonth)) earned.add('five_new_month');

  // Derinlik: detay modu kullanılan fincan sayısı
  if (sorted.filter(isDetailed).length >= BADGE_RULES.detailedCups) earned.add('depth');

  return BADGES.filter((b) => earned.has(b.id));
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
