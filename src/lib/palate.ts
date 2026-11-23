import {
  METHOD_TYPES,
  NOTE_PAIR_TYPES,
  PALATE_RULES,
  PALATE_TYPES,
  SINGLE_NOTE_TYPES,
  type PalateType,
} from '../config/scoring.config';
import { placeKey } from './scoring';
import type { CupEntry, Method, TasteNote } from './types';

type PalateSource = Pick<CupEntry, 'method' | 'venueKind' | 'placeName' | 'notes' | 'createdAt'>;

export function mostCommon<T extends string>(items: T[]): T[] {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  // En sık olan önce; eşitlikte en son görülen önce gelsin (güncel zevk ağır basar).
  const lastIndex = (x: T) => items.lastIndexOf(x);
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || lastIndex(b) - lastIndex(a));
}

/**
 * Damak tipini son fincanlardan hesaplar.
 * Tat notu varsa (detay modu) notlardan, yoksa yöntem + mekan türünden.
 */
export function computePalateTypeId(entries: PalateSource[], opts: { wholePeriod?: boolean } = {}): string {
  if (opts.wholePeriod) return rawPalateTypeId(entries, opts);
  // Kararlı tip: ham hesap fincan fincan izlenir; tip yalnızca ham sonuç art arda iki fincanda AYNI yeni tipi
  // gösterince değişir. İki yöntem arasında gidip gelen kullanıcının tipi her fincanda değişmez.
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (sorted.length === 0) return rawPalateTypeId(sorted);
  const t = createPalateTracker();
  for (let i = 0; i < sorted.length; i++) palateStep(t, sorted.slice(Math.max(0, i + 1 - PALATE_RULES.window), i + 1));
  return t.stable!;
}

/** Kararlı damak tipini fincan fincan izleyen durum (toplu yeniden puanlamada da kullanılır). */
export type PalateTracker = { stable: string | null; prev: string | null };
export function createPalateTracker(): PalateTracker {
  return { stable: null, prev: null };
}
/** Bir fincan ilerletir. `recent`: bu fincanla biten son N fincan (tarih sırasıyla). Kararlı tipi döner. */
export function palateStep(t: PalateTracker, recent: PalateSource[]): string {
  const c = rawPalateTypeId(recent);
  if (t.stable === null || c === t.prev) t.stable = c;
  t.prev = c;
  return t.stable;
}

/** Damak tipinin ham hesabı (son N fincan; dönem raporunda dönemin tamamı). */
export function rawPalateTypeId(entries: PalateSource[], opts: { wholePeriod?: boolean } = {}): string {
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Profil için son N fincan; dönem raporları (Özet) için dönemin tamamı (en çok yöntemle çelişmesin).
  const recent = opts.wholePeriod ? sorted : sorted.slice(-PALATE_RULES.window);
  if (recent.length === 0) return METHOD_TYPES.filter.out;

  // 1) Tat notları: sadece fincanların yeterli kısmında not varsa (tek bir detaylı fincan tipi değiştirmesin)
  const notes: TasteNote[] = recent.flatMap((e) => e.notes);
  const withNotes = recent.filter((e) => e.notes.length > 0).length;
  if (notes.length > 0 && withNotes / recent.length >= PALATE_RULES.notesShare) {
    const ranked = mostCommon(notes);
    if (ranked.length >= 2) {
      const [a, b] = ranked;
      const pair = NOTE_PAIR_TYPES.find(
        (p) => (p.notes[0] === a && p.notes[1] === b) || (p.notes[0] === b && p.notes[1] === a),
      );
      if (pair) return pair.typeId;
    }
    return SINGLE_NOTE_TYPES[ranked[0]];
  }

  // 2) Çok farklı mekan → Kafe Göçebesi
  const nomadSlice = recent.slice(-PALATE_RULES.nomadWindow);
  const places = new Set(
    nomadSlice.map((e) => placeKey(e)).filter((k): k is string => !!k), // zincirin şubeleri tek mekan
  );
  if (places.size >= PALATE_RULES.nomadDistinctPlaces) return 'cafe_nomad';

  // 3) En sık yöntem
  const method: Method = mostCommon(recent.map((e) => e.method))[0];
  if (method === 'filter') {
    const filters = recent.filter((e) => e.method === 'filter');
    const atHome = filters.filter((e) => e.venueKind === 'home').length;
    return atHome * 2 >= filters.length ? METHOD_TYPES.filter.home : METHOD_TYPES.filter.out;
  }
  return METHOD_TYPES[method];
}

export function getPalateType(id: string): PalateType {
  return PALATE_TYPES.find((t) => t.id === id) ?? PALATE_TYPES[0];
}

/**
 * Damak tipinin gerekçesi (tek satır): "En sık tat notların: Meyvemsi ve Parlak-ekşi" gibi.
 * Gösterilen (kararlı) tip, son fincanların ham sonucundan farklıysa genel bir cümle döner.
 */
export type PalateReason =
  | { kind: 'notes'; notes: TasteNote[] }
  | { kind: 'nomad'; places: number; of: number }
  | { kind: 'method'; method: Method; home: boolean | null }
  | { kind: 'settling' };
export function palateReason(entries: PalateSource[]): PalateReason | null {
  if (!entries.length) return null;
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const stable = computePalateTypeId(sorted);
  if (rawPalateTypeId(sorted) !== stable) return { kind: 'settling' };
  const recent = sorted.slice(-PALATE_RULES.window);
  const notes: TasteNote[] = recent.flatMap((e) => e.notes);
  const withNotes = recent.filter((e) => e.notes.length > 0).length;
  if (notes.length > 0 && withNotes / recent.length >= PALATE_RULES.notesShare) return { kind: 'notes', notes: mostCommon(notes).slice(0, 2) };
  const nomadSlice = recent.slice(-PALATE_RULES.nomadWindow);
  const places = new Set(nomadSlice.map((e) => placeKey(e)).filter((k): k is string => !!k));
  if (places.size >= PALATE_RULES.nomadDistinctPlaces) return { kind: 'nomad', places: places.size, of: nomadSlice.length };
  const method: Method = mostCommon(recent.map((e) => e.method))[0];
  const ofMethod = recent.filter((e) => e.method === method);
  const atHome = ofMethod.filter((e) => e.venueKind === 'home').length;
  return { kind: 'method', method, home: method === 'filter' ? atHome * 2 >= ofMethod.length : null };
}
