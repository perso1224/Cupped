import { BADGES, CAFFEINE_MG, LEVELS, PALATE_RULES, PART_MAX, WEEKLY } from '../config/scoring.config';
import { addDays, badgeProgress, dayKey, discoveriesIn, inRange, startOfWeek } from './progress';
import type { CupEntry, Method } from './types';

// Ana sayfa (Cal AI tarzı panolar) için saf hesaplar. Testli.

export type PartAverages = {
  effort: { avg: number; fraction: number };
  discovery: { avg: number; fraction: number };
  depth: { avg: number; fraction: number };
  cups: number;
};

/** Bu haftanın Emek / Keşif / Derinlik ortalamaları ve halka doluluğu (0-1). */
export function weekPartAverages(entries: CupEntry[], now: Date = new Date()): PartAverages {
  const ws = startOfWeek(now);
  const list = entries.filter((e) => inRange(e, ws, addDays(ws, 7)));
  const avg = (k: 'effort' | 'discovery' | 'depth') =>
    list.length ? Math.round(list.reduce((s, e) => s + Math.max(0, e.parts[k]), 0) / list.length) : 0;
  const part = (k: 'effort' | 'discovery' | 'depth') => {
    const a = avg(k);
    return { avg: a, fraction: Math.min(1, a / PART_MAX[k]) };
  };
  return { effort: part('effort'), discovery: part('discovery'), depth: part('depth'), cups: list.length };
}

export type CaffeineToday = { mg: number; cups: number; minutesSinceLast: number | null };

export function caffeineToday(entries: CupEntry[], now: Date = new Date()): CaffeineToday {
  const key = dayKey(now);
  const today = entries.filter((e) => dayKey(new Date(e.createdAt)) === key);
  const last = entries.reduce<string | null>((m, e) => (!m || e.createdAt > m ? e.createdAt : m), null);
  return {
    mg: today.reduce((s, e) => s + CAFFEINE_MG[e.method], 0),
    cups: today.length,
    minutesSinceLast: last ? Math.max(0, Math.round((now.getTime() - new Date(last).getTime()) / 60000)) : null,
  };
}

/** "2 sa", "35 dk", "3 gün" */
export function agoLabel(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.max(1, minutes)} dk`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} sa`;
  return `${Math.round(minutes / 1440)} gün`;
}

export type LevelProgress = { avg: number; level: string; next: string | null; toNext: number; fraction: number };

/** Son fincanların ortalamasına göre seviye ve bir sonraki seviyeye kalan puan. */
export function levelProgress(entries: CupEntry[]): LevelProgress | null {
  if (!entries.length) return null;
  const recent = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, PALATE_RULES.window);
  const avg = Math.round(recent.reduce((s, e) => s + e.score, 0) / recent.length);
  const asc = [...LEVELS].sort((a, b) => a.min - b.min);
  const idx = asc.reduce((i, l, j) => (avg >= l.min ? j : i), 0);
  const cur = asc[idx];
  const next = asc[idx + 1] ?? null;
  if (!next) return { avg, level: cur.label, next: null, toNext: 0, fraction: 1 };
  return {
    avg,
    level: cur.label,
    next: next.label,
    toNext: next.min - avg,
    fraction: Math.max(0, Math.min(1, (avg - cur.min) / (next.min - cur.min))),
  };
}

export type Nudge = { emoji: string; text: string };

const METHOD_NAMES: Record<Method, string> = {
  espresso: 'espresso',
  filter: 'filtre kahve',
  coldbrew: 'soğuk demleme',
  milk: 'sütlü kahve',
  turkish: 'Türk kahvesi',
};

/**
 * "Günün önerisi": geçmişe bakarak uygun önerileri sıralar, her gün farklı birini seçer.
 * Hiç fincan yoksa null (ana sayfada zaten "İlk fincanını ekle" var).
 */
export function dailyNudge(entries: CupEntry[], now: Date = new Date()): Nudge | null {
  if (!entries.length) return null;
  const options: Nudge[] = [];
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Denenmemiş yöntem
  const tried = new Set(sorted.map((e) => e.method));
  const untried = (Object.keys(METHOD_NAMES) as Method[]).filter((m) => !tried.has(m));
  if (untried.length) {
    const m = untried[now.getDate() % untried.length];
    options.push({ emoji: '🧪', text: `Hiç ${METHOD_NAMES[m]} denemedin. İlk denemene +10 Keşif.` });
  }

  // Son 3 gün aynı yöntem → hafif takılma
  const last3 = [0, 1, 2].map((d) => {
    const k = dayKey(addDays(now, -d));
    const day = sorted.filter((e) => dayKey(new Date(e.createdAt)) === k);
    return day.length ? day[day.length - 1].method : null;
  });
  if (last3.every((m) => m && m === last3[0])) {
    options.push({ emoji: '🔁', text: `3 gündür ${METHOD_NAMES[last3[0]!]}. Yarın farklı bir şey? Ya da seriye devam, rozet yakın 😉` });
  }

  // Haftalık keşif hedefi
  const ws = startOfWeek(now);
  const disc = discoveriesIn(entries, ws, addDays(ws, 7));
  const done = disc.places.length + disc.methods.length;
  if (done < WEEKLY.discoveryGoal) {
    const left = WEEKLY.discoveryGoal - done;
    options.push({ emoji: '🧭', text: `Bu hafta ${left} yeni keşif daha: yeni bir kafe ya da yeni bir yöntem.` });
  }

  // Yakın rozet (%40 ve üstü ilerlemiş, kazanılmamış)
  const near = badgeProgress(entries)
    .filter((p) => !p.earned && p.target > 1 && p.current / p.target >= 0.4)
    .sort((a, b) => b.current / b.target - a.current / a.target)[0];
  if (near) options.push({ emoji: '🏅', text: `${near.badge.name}: ${near.current}/${near.target}. ${near.badge.howTo}.` });

  // Detay modu hiç kullanılmadıysa
  if (!sorted.some((e) => e.notes.length || e.origin)) {
    options.push({ emoji: '👃', text: "Bir sonraki fincanda 'Detay ekle' ile 2 tat notu seç; damak tipin netleşsin." });
  }

  if (!options.length) {
    const b = BADGES[now.getDate() % BADGES.length];
    return { emoji: '☕', text: `Bugün için bir fikir: ${b.howTo.toLocaleLowerCase('tr-TR')}.` };
  }
  // Her gün farklı öneri (gün numarasına göre döner)
  const dayIndex = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86_400_000);
  return options[dayIndex % options.length];
}
