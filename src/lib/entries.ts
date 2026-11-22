import type { CupEntry, Grind, Method, ScoreParts, TasteNote, VenueKind } from './types';

// Kayıtları okurken doğrulama/onarım. Saf fonksiyonlar (telefon hafızasına dokunmaz), testli.

const METHODS: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];
const VENUES: VenueKind[] = ['home', 'independent', 'chain', 'office'];
const NOTES: TasteNote[] = ['fruity', 'floral', 'chocolate', 'nutty', 'caramel', 'bright', 'bold'];
const GRINDS: Grind[] = ['fine', 'medium', 'coarse'];
/** Metin alanları için üst sınır (bozuk/elle düzenlenmiş yedeklerde aşırı uzun değerler ekranı bozmasın). */
const MAX_TEXT = 500;
const MAX_NAME = 80;
const ZERO_PARTS: ScoreParts = { base: 0, effort: 0, depth: 0, discovery: 0, selectivity: 0 };

export class CorruptDataError extends Error {}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || d);
/** Pozitif sonlu sayı ya da null. */
const posOrNull = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : null;
};
/** 1-5 arası tam sayı yıldız; değilse null. */
export const ratingOrNull = (v: unknown): number | null => {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  return n >= 1 && n <= 5 ? n : null;
};
const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.slice(0, max) : null);

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
  const notes = Array.isArray(r.notes) ? [...new Set(r.notes.filter((n: unknown) => NOTES.includes(n as TasteNote)))].slice(0, 2) : [];
  const doseG = r.brew && typeof r.brew === 'object' ? posOrNull(r.brew.doseG) : null;
  const waterMl = r.brew && typeof r.brew === 'object' ? posOrNull(r.brew.waterMl) : null;
  const grind = r.brew && typeof r.brew === 'object' && GRINDS.includes(r.brew.grind) ? (r.brew.grind as Grind) : null;
  const parts = { ...ZERO_PARTS };
  if (r.parts && typeof r.parts === 'object') for (const k of Object.keys(ZERO_PARTS) as (keyof ScoreParts)[]) parts[k] = num(r.parts[k]);
  return {
    id: r.id,
    // Tüm uygulama ISO-UTC metin karşılaştırmasıyla sıralar; "+03:00" gibi biçimleri tek biçime çevir.
    createdAt: new Date(r.createdAt).toISOString(),
    photoUri: toRelativePhoto(r.photoUri),
    method: r.method,
    placeName: text(r.placeName, MAX_NAME),
    venueKind,
    notes: notes as CupEntry['notes'],
    origin: text(r.origin, MAX_NAME),
    brew: doseG || waterMl || grind ? { doseG, waterMl, grind } : null,
    note: text(r.note, MAX_TEXT),
    rating: ratingOrNull(r.rating),
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
  return parseEntriesDetailed(raw).entries;
}

/** parseEntries + kaç kaydın okunamadığı (atlanan kayıtlar varsa ham veri yazmadan önce ayrıca saklanır). */
export function parseEntriesDetailed(raw: string | null): { entries: CupEntry[]; dropped: number } {
  if (raw == null || raw === '') return { entries: [], dropped: 0 };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new CorruptDataError('entries JSON okunamadı');
  }
  if (!Array.isArray(data)) throw new CorruptDataError('entries bir liste değil');
  const seen = new Set<string>();
  const out: CupEntry[] = [];
  let dropped = 0;
  for (const item of data) {
    const e = normalizeEntry(item);
    // Kayıt okunamadıysa ya da bilinmeyen tat notu atıldıysa (ör. daha yeni bir sürümden) "kayıplı" say
    const lossyNotes =
      !!e && Array.isArray((item as { notes?: unknown }).notes) && (item as { notes: unknown[] }).notes.some((n) => !NOTES.includes(n as TasteNote));
    if (!e || lossyNotes) dropped++;
    if (!e) continue;
    if (!seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return { entries: out.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), dropped };
}
