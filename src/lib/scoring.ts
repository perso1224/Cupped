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

/**
 * Yazılan mekan adının kimliği (aynı mekanın farklı yazımları tek çip olsun). Zincir şubelerini AYIRIR.
 * Latin harfi olmayan adlarda (ör. "Кофе", "☕") boş kalmasın diye ada düşer.
 */
export function placeNameKey(name: string): string {
  return normalizePlace(name) || name.trim().toLocaleLowerCase('tr-TR');
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
  // Aynı ad için tekrar tekrar zincir taraması yapılmasın (binlerce fincanda pahalı)
  const cached = keyCache.get(entry.placeName);
  if (cached !== undefined) return cached;
  const chain = matchChain(entry.placeName);
  const key = chain ? `chain:${chain}` : normalizePlace(entry.placeName) || entry.placeName.trim().toLocaleLowerCase('tr-TR');
  if (keyCache.size > 5000) keyCache.clear();
  keyCache.set(entry.placeName, key);
  return key;
}
const keyCache = new Map<string, string>();

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
 * Geçmişin skor için gereken özeti. Fincanlar tarih sırasıyla eklenir (`add`).
 * Hem tek fincan skorunda hem toplu yeniden puanlamada kullanılır: toplu işte geçmiş her fincan için
 * baştan taranmaz, özet adım adım büyür (binlerce fincanda da hızlı).
 */
export type HistoryIndex = {
  /** Gidilmiş mekanlar. */
  seen: Set<string>;
  /** Hafta → o hafta ilk kez gidilen mekan sayısı. */
  newPlacesByWeek: Map<string, number>;
  /** Mekan → son ziyaret zamanı (ISO). */
  lastVisit: Map<string, string>;
  /** Denenmiş yöntemler ve "yöntem|ay" çiftleri. */
  methods: Set<string>;
  methodMonths: Set<string>;
  /** Sondaki art arda aynı zincir ziyaretleri. */
  chain: string | null;
  chainRun: number;
};

export function createHistoryIndex(): HistoryIndex {
  return { seen: new Set(), newPlacesByWeek: new Map(), lastVisit: new Map(), methods: new Set(), methodMonths: new Set(), chain: null, chainRun: 0 };
}

/** Özete bir fincan ekler (tarih sırasıyla çağrılmalı). `before` verilirse son ziyaret yalnızca ondan önceki fincanlardan tutulur. */
export function addToIndex(ix: HistoryIndex, e: Pick<CupEntry, 'placeName' | 'venueKind' | 'method' | 'createdAt'>, before?: string) {
  const k = placeKey(e);
  if (k) {
    if (!ix.seen.has(k)) {
      ix.seen.add(k);
      const wk = weekKey(e.createdAt);
      ix.newPlacesByWeek.set(wk, (ix.newPlacesByWeek.get(wk) ?? 0) + 1);
    }
    if (before === undefined || e.createdAt < before) ix.lastVisit.set(k, e.createdAt);
  }
  ix.methods.add(e.method);
  ix.methodMonths.add(`${e.method}|${monthKey(e.createdAt)}`);
  const c = e.venueKind === 'chain' && e.placeName ? matchChain(e.placeName) : null;
  if (c && c === ix.chain) ix.chainRun++;
  else {
    ix.chain = c;
    ix.chainRun = c ? 1 : 0;
  }
}

/** Keşif puanı: ilk kez gidilen mekan (haftalık sınırla), uzun aradan dönüş, yeni yöntem / bu ay ilk kez. */
export function discoveryPoints(input: Pick<CupInput, 'placeName' | 'venueKind' | 'method'>, ix: HistoryIndex, at: string): number {
  let discovery = 0;
  const key = placeKey(input);
  if (key) {
    const newThisWeek = ix.newPlacesByWeek.get(weekKey(at)) ?? 0;
    if (!ix.seen.has(key) && newThisWeek < SCORING.discovery.newPlacePerWeek) discovery += SCORING.discovery.newPlace;
    else if (ix.seen.has(key)) {
      // Uzun aradan sonra dönülen mekan: küçük "yeniden keşif" puanı
      const last = ix.lastVisit.get(key);
      if (last && last < at && Date.parse(at) - Date.parse(last) >= SCORING.discovery.returnAfterDays * 86400000) {
        discovery += SCORING.discovery.returnPlace;
      }
    }
  }
  if (!ix.methods.has(input.method)) discovery += SCORING.discovery.newMethod;
  else if (!ix.methodMonths.has(`${input.method}|${monthKey(at)}`)) discovery += SCORING.discovery.methodThisMonth; // bu ay ilk kez bu yöntem
  return discovery;
}

/**
 * Bu fincan yeni bir mekan olduğu halde haftalık yeni mekan sınırı yüzünden keşif puanı almadı mı?
 * (Sonuç ekranında "neden +0" açıklaması için.) Saf, testli.
 */
export function newPlaceCapped(entry: Pick<CupEntry, 'placeName' | 'venueKind' | 'createdAt'>, all: Pick<CupEntry, 'placeName' | 'venueKind' | 'createdAt'>[]): boolean {
  const key = placeKey(entry);
  if (!key) return false;
  const earlier = all.filter((e) => e.createdAt < entry.createdAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const seen = new Set<string>();
  let newThisWeek = 0;
  const wk = weekKey(entry.createdAt);
  for (const e of earlier) {
    const k = placeKey(e);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    if (weekKey(e.createdAt) === wk) newThisWeek++;
  }
  return !seen.has(key) && newThisWeek >= SCORING.discovery.newPlacePerWeek;
}

/**
 * Fincan Skoru (0-100, mutlak).
 * @param input  yeni fincan
 * @param history  daha önceki kayıtlar (sıra önemsiz; tarihe göre sıralanır)
 * @param at  fincanın zamanı (haftalık keşif sınırı için)
 */
export function scoreCup(input: CupInput, history: CupEntry[], at: string = new Date().toISOString()): ScoreResult {
  const past = [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const ix = createHistoryIndex();
  for (const e of past) addToIndex(ix, e, at);

  const base = SCORING.base;
  const effort = SCORING.effort[input.venueKind];

  let depth = 0;
  if (new Set(input.notes).size >= 2) depth += SCORING.depth.twoNotes;
  if (input.origin && input.origin.trim()) depth += SCORING.depth.origin;

  const discovery = discoveryPoints(input, ix, at);

  let selectivity = 0;
  if (input.venueKind === 'chain' && input.placeName) {
    const chain = matchChain(input.placeName);
    // Sondan geriye, aynı zincire art arda kaç ziyaret var? (bu fincan dahil)
    const streak = 1 + (chain && ix.chain === chain ? ix.chainRun : 0);
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
