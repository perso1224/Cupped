import { PALATE_TYPES } from '../config/scoring.config';
import type { CupEntry, Method, TasteNote } from './types';

/**
 * Damak Uyumu (sunucusuz): damak zevki 6 karakterlik bir koda sıkıştırılır ("K7R-X2M").
 * Arkadaşın kodu kendi telefonunda çözülür ve senin verinle karşılaştırılır; hiçbir şey internete gitmez.
 * Kodda yalnızca zevk özeti var: damak tipi, en sevilen 2 tat notu, yöntem payları, ev/kafe dengesi.
 * İsim, fincanlar, fotoğraflar, mekan adları YOK.
 *
 * Bit düzeni (30 bit = 6 harf, Crockford base32): sürüm 2 · tip 4 · not1 3 · not2 3 · 5 yöntem × 2 · ev 2 · kafe 2 · sağlama 4
 */
export const METHODS_ORDER: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];
export const NOTES_ORDER: TasteNote[] = ['fruity', 'floral', 'chocolate', 'nutty', 'caramel', 'bright', 'bold'];
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // I, L, O, U yok (karışmasın)
const VERSION = 1;

export type TasteProfile = {
  typeId: string;
  notes: TasteNote[]; // en fazla 2, en sık olan önce
  methods: Record<Method, number>; // 0-3 (pay: hiç / az / orta / çok)
  home: number; // 0-3
  cafe: number; // 0-3
};

const q = (share: number) => (share <= 0 ? 0 : share < 0.25 ? 1 : share < 0.5 ? 2 : 3);

/** Son 20 fincandan zevk özeti. */
export function tasteProfile(entries: CupEntry[], typeId: string): TasteProfile | null {
  const recent = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
  if (!recent.length) return null;
  const n = recent.length;
  const noteCounts = new Map<TasteNote, number>();
  for (const e of recent) for (const x of e.notes ?? []) noteCounts.set(x, (noteCounts.get(x) ?? 0) + 1);
  const notes = [...noteCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  const methods = Object.fromEntries(METHODS_ORDER.map((m) => [m, q(recent.filter((e) => e.method === m).length / n)])) as Record<Method, number>;
  return {
    typeId,
    notes,
    methods,
    home: q(recent.filter((e) => e.venueKind === 'home').length / n),
    cafe: q(recent.filter((e) => e.venueKind === 'independent' || e.venueKind === 'chain').length / n),
  };
}

function checksum(v: number): number {
  let s = 0;
  for (let i = 0; i < 26; i += 4) s = (s + ((v >>> i) & 0xf) * (i / 4 + 3)) & 0xf;
  return s;
}

export function encodeProfile(p: TasteProfile): string {
  const typeIdx = Math.max(0, PALATE_TYPES.findIndex((t) => t.id === p.typeId));
  const noteIdx = (k?: TasteNote) => (k ? NOTES_ORDER.indexOf(k) + 1 : 0);
  let v = VERSION;
  v = (v << 4) | typeIdx;
  v = (v << 3) | noteIdx(p.notes[0]);
  v = (v << 3) | noteIdx(p.notes[1]);
  for (const m of METHODS_ORDER) v = (v << 2) | (p.methods[m] & 3);
  v = (v << 2) | (p.home & 3);
  v = (v << 2) | (p.cafe & 3);
  v = v >>> 0; // 26 bit
  const full = (v * 16 + checksum(v)) >>> 0; // 30 bit
  let s = '';
  for (let i = 5; i >= 0; i--) s += ALPHABET[Math.floor(full / 32 ** i) % 32];
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

/** Kodu çözer; yazım hatası/uydurma kodda null. Küçük harf, boşluk, tire ve O/I/L karışıklığı tolere edilir. */
export function decodeCode(raw: string): TasteProfile | null {
  const s = raw.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== 6) return null;
  let full = 0;
  for (const ch of s) {
    const d = ALPHABET.indexOf(ch);
    if (d < 0) return null;
    full = full * 32 + d;
  }
  const v = Math.floor(full / 16);
  if ((full & 0xf) !== checksum(v)) return null;
  let x = v;
  const take = (bits: number) => {
    const r = x & ((1 << bits) - 1);
    x = x >>> bits;
    return r;
  };
  const cafe = take(2);
  const home = take(2);
  const ms = METHODS_ORDER.map(() => take(2)).reverse();
  const n2 = take(3);
  const n1 = take(3);
  const typeIdx = take(4);
  const version = take(2);
  if (version !== VERSION || typeIdx >= PALATE_TYPES.length || n1 > NOTES_ORDER.length || n2 > NOTES_ORDER.length) return null;
  const notes = [n1, n2].filter((i) => i > 0).map((i) => NOTES_ORDER[i - 1]);
  return {
    typeId: PALATE_TYPES[typeIdx].id,
    notes,
    methods: Object.fromEntries(METHODS_ORDER.map((m, i) => [m, ms[i]])) as Record<Method, number>,
    home,
    cafe,
  };
}

export type Match = {
  pct: number;
  common: { kind: 'note'; note: TasteNote } | { kind: 'method'; method: Method } | { kind: 'type' } | null;
  clash: 'milk' | 'espressoFilter' | 'homeCafe' | 'turkish' | null;
  idea: 'thirdWave' | 'homeBrew' | 'turkish' | 'cold' | 'espressoBar';
};

/** İki zevk özetinin uyumu (0-100) ve sonuç kartındaki cümleler için malzeme. Simetrik. */
export function compatibility(a: TasteProfile, b: TasteProfile): Match {
  const sameType = a.typeId === b.typeId;
  const shared = a.notes.filter((x) => b.notes.includes(x));
  const methodDiff = METHODS_ORDER.reduce((s, m) => s + Math.abs(a.methods[m] - b.methods[m]), 0); // 0..15
  const placeDiff = Math.abs(a.home - b.home) + Math.abs(a.cafe - b.cafe); // 0..6
  const notesScore = a.notes.length && b.notes.length ? (shared.length / Math.max(a.notes.length, b.notes.length)) * 25 : 12;
  const raw = (sameType ? 20 : 0) + notesScore + (1 - methodDiff / 10) * 35 + (1 - placeDiff / 6) * 20;
  const pct = Math.round(Math.max(8, Math.min(99, raw)));

  const bothTop = METHODS_ORDER.filter((m) => a.methods[m] >= 2 && b.methods[m] >= 2);
  const common: Match['common'] = shared.length
    ? { kind: 'note', note: shared[0] }
    : bothTop.length
      ? { kind: 'method', method: bothTop[0] }
      : sameType
        ? { kind: 'type' }
        : null;

  const gap = (m: Method) => Math.abs(a.methods[m] - b.methods[m]);
  const clash: Match['clash'] =
    gap('milk') >= 2
      ? 'milk'
      : Math.abs(a.methods.espresso - a.methods.filter - (b.methods.espresso - b.methods.filter)) >= 3
        ? 'espressoFilter'
        : Math.abs(a.home - b.home) >= 2
          ? 'homeCafe'
          : gap('turkish') >= 2
            ? 'turkish'
            : null;

  const sum = (m: Method) => a.methods[m] + b.methods[m];
  const best = [...METHODS_ORDER].sort((x, y) => sum(y) - sum(x))[0];
  const idea: Match['idea'] =
    best === 'turkish' ? 'turkish' : best === 'coldbrew' ? 'cold' : best === 'espresso' ? 'espressoBar' : a.home + b.home >= a.cafe + b.cafe ? 'homeBrew' : 'thirdWave';
  return { pct, common, clash, idea };
}
