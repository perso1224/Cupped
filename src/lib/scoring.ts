import { CHAINS, LEVELS, SCORING } from '../config/scoring.config';
import type { CupEntry, CupInput, ScoreParts, ScoreResult, VenueKind } from './types';

/** Karşılaştırma için mekan adını sadeleştirir: küçük harf, Türkçe karakterler, boşluk/noktalama yok. */
export function normalizePlace(name: string): string {
  return name
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Kelimeleri koruyarak sadeleştirir: "Starbucks, Kadıköy!" → "starbucks kadikoy". */
function words(name: string): string {
  return name
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const CHAIN_KEYS = CHAINS.map((c) => ({ name: c.name, keys: [c.name, ...(c.aliases ?? [])].map(words) }));

/**
 * Mekan adı bir zincire aitse zincirin adını döner, yoksa null.
 * Tam kelime eşleşmesi: "Starbucks Kadıköy" ✓, "Armado Coffee" ✗ (Mado değil).
 */
export function matchChain(placeName: string): string | null {
  const w = words(placeName);
  if (!w) return null;
  const padded = ` ${w} `;
  const compact = w.replace(/ /g, '');
  for (const c of CHAIN_KEYS) {
    for (const k of c.keys) {
      if (padded.includes(` ${k} `)) return c.name;
      // Boşluksuz yazım ("kahvedunyasikadikoy"): sadece uzun adlarda, başta eşleşirse
      const kc = k.replace(/ /g, '');
      if (kc.length >= 6 && compact.startsWith(kc)) return c.name;
    }
  }
  return null;
}

/** Elle yazılan mekan adından mekan türünü çıkarır (zincir mi bağımsız mı). */
export function classifyPlace(placeName: string): VenueKind {
  return matchChain(placeName) ? 'chain' : 'independent';
}

/**
 * Mekan kimliği (skor, hedefler, pasaport, rozetler hep bunu kullanır).
 * Zincirin şubeleri tek mekan sayılır ("Starbucks Moda" = "Starbucks Kadıköy").
 */
export function placeKey(entry: Pick<CupEntry, 'placeName' | 'venueKind'>): string | null {
  if (entry.venueKind === 'home' || entry.venueKind === 'office' || !entry.placeName) return null;
  const chain = matchChain(entry.placeName);
  return chain ? `chain:${chain}` : normalizePlace(entry.placeName) || entry.placeName.trim().toLocaleLowerCase('tr-TR');
}

/** Yerel saatle ay anahtarı. */
function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/** Yerel saatle haftanın (Pazartesi) anahtarı. */
function weekKey(iso: string): string {
  const d = new Date(iso);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
}

/**
 * Fincan Skoru (0-100, mutlak).
 * @param input  yeni fincan
 * @param history  daha önceki kayıtlar (sıra önemsiz; tarihe göre sıralanır)
 * @param at  fincanın zamanı (haftalık keşif sınırı için)
 */
export function scoreCup(input: CupInput, history: CupEntry[], at: string = new Date().toISOString()): ScoreResult {
  const past = [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const base = SCORING.base;
  const effort = SCORING.effort[input.venueKind];

  let depth = 0;
  if (new Set(input.notes).size >= 2) depth += SCORING.depth.twoNotes;
  if (input.origin && input.origin.trim()) depth += SCORING.depth.origin;

  let discovery = 0;
  const key = placeKey(input);
  if (key) {
    // Geçmişte ilk kez gidilen mekanlar; bu hafta kaç tane oldu?
    const seen = new Set<string>();
    let newThisWeek = 0;
    const wk = weekKey(at);
    for (const e of past) {
      const k = placeKey(e);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      if (weekKey(e.createdAt) === wk) newThisWeek++;
    }
    if (!seen.has(key) && newThisWeek < SCORING.discovery.newPlacePerWeek) discovery += SCORING.discovery.newPlace;
    else if (seen.has(key)) {
      // Uzun aradan sonra dönülen mekan: küçük "yeniden keşif" puanı
      const last = [...past].reverse().find((e) => placeKey(e) === key && e.createdAt < at);
      if (last && Date.parse(at) - Date.parse(last.createdAt) >= SCORING.discovery.returnAfterDays * 86400000) {
        discovery += SCORING.discovery.returnPlace;
      }
    }
  }
  if (!past.some((e) => e.method === input.method)) discovery += SCORING.discovery.newMethod;
  else if (!past.some((e) => e.method === input.method && monthKey(e.createdAt) === monthKey(at))) {
    discovery += SCORING.discovery.methodThisMonth; // bu ay ilk kez bu yöntem
  }

  let selectivity = 0;
  if (input.venueKind === 'chain' && input.placeName) {
    const chain = matchChain(input.placeName);
    // Sondan geriye, aynı zincire art arda kaç ziyaret var?
    let streak = 1; // bu fincan dahil
    for (let i = past.length - 1; i >= 0; i--) {
      const e = past[i];
      if (e.venueKind === 'chain' && e.placeName && matchChain(e.placeName) === chain) streak++;
      else break;
    }
    if (streak >= SCORING.selectivity.sameChainStreakFrom) selectivity = SCORING.selectivity.penalty;
  }

  const raw = base + effort + depth + discovery + selectivity;
  const total = Math.max(SCORING.min, Math.min(SCORING.max, raw));
  return { total, parts: { base, effort, depth, discovery, selectivity } };
}

/** Skora karşılık gelen seviye etiketi. */
export function levelFor(score: number): string {
  return (LEVELS.find((l) => score >= l.min) ?? LEVELS[LEVELS.length - 1]).label;
}

/** Skorun nereden geldiği, kısa: "Emek +25 · Keşif +15" (taban ve 0 olan parçalar yazılmaz). */
export function partsSummary(parts: ScoreParts, labels: Record<'effort' | 'discovery' | 'depth' | 'selectivity', string>): string {
  return (['effort', 'discovery', 'depth', 'selectivity'] as const)
    .filter((k) => parts[k] !== 0)
    .map((k) => `${labels[k]} ${parts[k] > 0 ? '+' : ''}${parts[k]}`)
    .join(' · ');
}
