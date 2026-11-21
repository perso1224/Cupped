import { CHAINS, LEVELS, SCORING } from '../config/scoring.config';
import type { CupEntry, CupInput, ScoreResult, VenueKind } from './types';

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

/** Mekan adı zincir listesinde geçiyorsa zincirin adını döner, yoksa null. */
export function matchChain(placeName: string, chains: string[] = CHAINS): string | null {
  const key = normalizePlace(placeName);
  if (!key) return null;
  for (const chain of chains) {
    const chainKey = normalizePlace(chain);
    if (key === chainKey || key.startsWith(chainKey) || key.includes(chainKey)) return chain;
  }
  return null;
}

/** Elle yazılan mekan adından mekan türünü çıkarır (zincir mi bağımsız mı). */
export function classifyPlace(placeName: string): VenueKind {
  return matchChain(placeName) ? 'chain' : 'independent';
}

function placeKey(entry: Pick<CupEntry, 'placeName' | 'venueKind'>): string | null {
  if (entry.venueKind === 'home' || entry.venueKind === 'office' || !entry.placeName) return null;
  return normalizePlace(entry.placeName);
}

/**
 * Fincan Skoru (0-100, mutlak).
 * @param input  yeni fincan
 * @param history  daha önceki kayıtlar (sıra önemsiz; tarihe göre sıralanır)
 */
export function scoreCup(input: CupInput, history: CupEntry[]): ScoreResult {
  const past = [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const base = SCORING.base;
  const effort = SCORING.effort[input.venueKind];

  let depth = 0;
  if (input.notes.length >= 2) depth += SCORING.depth.twoNotes;
  if (input.origin && input.origin.trim()) depth += SCORING.depth.origin;

  let discovery = 0;
  const key = placeKey(input);
  if (key && !past.some((e) => placeKey(e) === key)) discovery += SCORING.discovery.newPlace;
  if (!past.some((e) => e.method === input.method)) discovery += SCORING.discovery.newMethod;

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
