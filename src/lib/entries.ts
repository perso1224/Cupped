import type { CupEntry, Method, ScoreParts, VenueKind } from './types';

// Kayıtları okurken doğrulama/onarım. Saf fonksiyonlar (telefon hafızasına dokunmaz), testli.

const METHODS: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];
const VENUES: VenueKind[] = ['home', 'independent', 'chain', 'office'];
const ZERO_PARTS: ScoreParts = { base: 0, effort: 0, depth: 0, discovery: 0, selectivity: 0 };

export class CorruptDataError extends Error {}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || d);

/**
 * Fotoğraf yolunu "cups/<id>.jpg" gibi göreli hale getirir.
 * Eski kayıtlarda tam adres (file:///…/Documents/…/cups/x.jpg) saklanıyordu; iOS güncellemede bu adres değişebilir.
 */
export function toRelativePhoto(uri: unknown): string | null {
  if (typeof uri !== 'string' || !uri) return null;
  if (!uri.includes('://')) return uri.replace(/^\/+/, '');
  const i = uri.lastIndexOf('/cups/');
  return i >= 0 ? uri.slice(i + 1) : uri; // cups dışındaki eski adresler olduğu gibi kalır
}

/** Tek kaydı doğrular ve eksik alanları tamamlar. Kurtarılamayan kayıt için null. */
export function normalizeEntry(raw: unknown): CupEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.createdAt !== 'string' || Number.isNaN(Date.parse(r.createdAt))) return null;
  if (!METHODS.includes(r.method)) return null;
  const venueKind: VenueKind = VENUES.includes(r.venueKind) ? r.venueKind : r.placeName ? 'independent' : 'home';
  const notes = Array.isArray(r.notes) ? [...new Set(r.notes.filter((n: unknown) => typeof n === 'string'))] : [];
  const parts = { ...ZERO_PARTS };
  if (r.parts && typeof r.parts === 'object') for (const k of Object.keys(ZERO_PARTS) as (keyof ScoreParts)[]) parts[k] = num(r.parts[k]);
  return {
    id: r.id,
    createdAt: r.createdAt,
    photoUri: toRelativePhoto(r.photoUri),
    method: r.method,
    placeName: typeof r.placeName === 'string' && r.placeName.trim() ? r.placeName : null,
    venueKind,
    notes: notes as CupEntry['notes'],
    origin: typeof r.origin === 'string' && r.origin.trim() ? r.origin : null,
    brew: r.brew && typeof r.brew === 'object' ? { doseG: r.brew.doseG ?? null, waterMl: r.brew.waterMl ?? null, grind: r.brew.grind ?? null } : null,
    note: typeof r.note === 'string' && r.note.trim() ? r.note : null,
    captureMs: typeof r.captureMs === 'number' && r.captureMs > 0 ? r.captureMs : null,
    score: Math.max(0, Math.min(100, num(r.score))),
    parts,
    palateTypeId: typeof r.palateTypeId === 'string' && r.palateTypeId ? r.palateTypeId : 'third_wave_nomad',
  };
}

/**
 * Saklanan metni kayıt listesine çevirir (en yeni önce).
 * Metin hiç okunamıyorsa CorruptDataError fırlatır: böylece üzerine yazılıp veri kaybedilmez.
 * Tek tek bozuk kayıtlar atlanır.
 */
export function parseEntries(raw: string | null): CupEntry[] {
  if (raw == null || raw === '') return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new CorruptDataError('entries JSON okunamadı');
  }
  if (!Array.isArray(data)) throw new CorruptDataError('entries bir liste değil');
  const seen = new Set<string>();
  const out: CupEntry[] = [];
  for (const item of data) {
    const e = normalizeEntry(item);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
