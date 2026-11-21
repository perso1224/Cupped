import {
  METHOD_TYPES,
  NOTE_PAIR_TYPES,
  PALATE_RULES,
  PALATE_TYPES,
  SINGLE_NOTE_TYPES,
  type PalateType,
} from '../config/scoring.config';
import { normalizePlace } from './scoring';
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
    nomadSlice.filter((e) => e.placeName && e.venueKind !== 'home' && e.venueKind !== 'office').map((e) => normalizePlace(e.placeName!)),
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
