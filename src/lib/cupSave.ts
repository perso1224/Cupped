import { computePalateTypeId } from './palate';
import { earnedBadges } from './progress';
import { refreshReminder } from './reminders';
import { classifyPlace, scoreCup } from './scoring';
import { discardPhoto, loadEntries, loadMetrics, newId, persistPhoto, saveEntry, updateEntry, updateMetrics } from './storage';
import type { CupEntry, CupInput, Grind, Method, TasteNote, VenueKind } from './types';
import { whenToDate, type When } from './when';

/**
 * Fincan ekleme/düzenleme formunun kaydı. Ekrandan ayrı tutulur: hata yakalama burada (ekran bileşeni
 * try/finally içermesin, React Compiler optimize edebilsin) ve mantık ekran olmadan test edilebilsin.
 */

export type Where = { kind: 'home' } | { kind: 'office' } | { kind: 'place'; name: string };

export type CupForm = {
  method: Method;
  where: Where;
  notes: TasteNote[];
  origin: string;
  dose: string;
  water: string;
  grind: Grind | null;
  note: string;
  rating: number | null;
  when: When;
  /** Geçici fotoğraf adresi (kamera/galeri) ya da null. */
  photo: string | null;
  photoWidth: number | undefined;
  /** Ekranın açıldığı an (kayıt süresi ölçümü). */
  openedAt: number;
};

/** "15,5" ya da "15.5" → 15.5; "1.000" / "1,000" → 1000 (binlik ayırıcı); boş/geçersiz → null */
export function parseNum(t: string): number | null {
  const s = t.trim();
  const thousands = /^\d{1,3}([.,]\d{3})+$/.test(s);
  const n = parseFloat(thousands ? s.replace(/[.,]/g, '') : s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Formdaki seçimlerden skoru etkileyen girdi. */
export function cupInput(f: Pick<CupForm, 'method' | 'where' | 'notes' | 'origin'>): CupInput {
  const venueKind: VenueKind = f.where.kind === 'place' ? classifyPlace(f.where.name) : f.where.kind;
  const placeName = f.where.kind === 'place' ? f.where.name : null;
  return { method: f.method, placeName, venueKind, notes: f.notes, origin: f.origin.trim() || null };
}

function brewOf(f: Pick<CupForm, 'dose' | 'water' | 'grind'>) {
  const doseG = parseNum(f.dose);
  const waterMl = parseNum(f.water);
  return doseG || waterMl || f.grind ? { doseG, waterMl, grind: f.grind } : null;
}

/** Damak Evrimi kutlaması en fazla haftada bir ve yeterli geçmişte (tip her fincanda "evrilmiş" görünmesin). */
export const EVOLUTION_RULES = { minHistory: 5, minDays: 7 };

export type CreateResult =
  | { ok: true; id: string; badges: string; evolvedFrom?: string; evolvedTo?: string }
  | { ok: false };

/** Yeni fincanı kaydeder. Başarısızsa kopyalanan fotoğraf silinir ve { ok: false } döner (fırlatmaz). */
export async function createCup(f: CupForm): Promise<CreateResult> {
  let photoUri: string | null = null;
  let saved = false;
  try {
    // Geçmişi kaydetme anında taze oku: ekran açılır açılmaz kaydedilirse yanlış "keşif" puanı verilmesin.
    const history = await loadEntries();
    const id = newId();
    const input = cupInput(f);
    const createdAt = whenToDate(f.when).toISOString();
    // Dün olarak eklenen fincan kendinden önceki fincanlara göre puanlanır; sonrakiler kayıtta yenilenir.
    const earlier = history.filter((e) => e.createdAt < createdAt);
    const { total, parts } = scoreCup(input, earlier, createdAt);
    const palateTypeId = computePalateTypeId([...earlier, { ...input, createdAt }]);
    if (f.photo) {
      try {
        photoUri = await persistPhoto(f.photo, id, { width: f.photoWidth });
      } catch {
        photoUri = null; // geçici dosya iOS tarafından silinir; adresini saklamak boş fotoğraf demek
      }
    }
    const newEntry: CupEntry = {
      id,
      createdAt,
      photoUri,
      ...input,
      brew: brewOf(f),
      note: f.note.trim() || null,
      rating: f.rating,
      captureMs: Date.now() - f.openedAt,
      score: total,
      parts,
      palateTypeId,
    };
    await saveEntry(newEntry);
    saved = true;

    const metrics = await loadMetrics();
    // Bu fincanla yeni kazanılan rozetler (sonuç ekranında kutlanır). Daha önce kutlananlar tekrar kutlanmaz.
    const before = new Set(earnedBadges(history).map((b) => b.id));
    const fresh = earnedBadges([...history, newEntry])
      .map((b) => b.id)
      .filter((b) => !before.has(b) && !metrics.celebratedBadges.includes(b));
    // Damak Evrimi: tip değiştiyse, yeterli geçmiş varsa ve son kutlamadan bu yana bir hafta geçtiyse
    const typeBefore = history.length >= EVOLUTION_RULES.minHistory ? computePalateTypeId(history) : null;
    const typeAfter = computePalateTypeId([...history, newEntry]);
    const lastEvo = metrics.lastEvolutionAt ? Date.parse(metrics.lastEvolutionAt) : 0;
    const evolved = !!typeBefore && typeBefore !== typeAfter && Date.now() - lastEvo >= EVOLUTION_RULES.minDays * 86400000;
    updateMetrics((m) => {
      m.newSaved += 1;
      m.celebratedBadges = [...new Set([...m.celebratedBadges, ...fresh])];
      if (evolved) m.lastEvolutionAt = new Date().toISOString();
    }).catch(() => {});
    refreshReminder();
    return { ok: true, id, badges: fresh.join(','), ...(evolved ? { evolvedFrom: typeBefore!, evolvedTo: typeAfter } : {}) };
  } catch {
    // Kayıt yazılamadıysa kopyalanan fotoğraf dosyası sahipsiz kalmasın
    if (photoUri && !saved) discardPhoto(photoUri);
    return { ok: false };
  }
}

/**
 * Düzenleme: skor, fincanın kendi tarihindeki geçmişe göre yeniden hesaplanır; kimlik korunur.
 * `when` verilirse fincanın günü de değişir (ör. yanlışlıkla "dün" eklenen fincan). Başarısızsa false.
 */
export async function editCup(orig: CupEntry, f: CupForm & { photoChanged: boolean; dateChanged: boolean }): Promise<boolean> {
  let newPhoto: string | null = null;
  try {
    const all = await loadEntries();
    const createdAt = f.dateChanged ? whenToDate(f.when).toISOString() : orig.createdAt;
    const before = all.filter((e) => e.id !== orig.id && e.createdAt < createdAt);
    const input = cupInput(f);
    // Skoru etkileyen bilgiler değişmediyse (ör. sadece yıldız, not ya da fotoğraf) skor olduğu gibi kalır.
    const scoringSame =
      !f.dateChanged &&
      input.method === orig.method &&
      input.placeName === orig.placeName &&
      input.venueKind === orig.venueKind &&
      input.notes.join() === (orig.notes ?? []).join() &&
      input.origin === orig.origin;
    const { total, parts } = scoringSame ? { total: orig.score, parts: orig.parts } : scoreCup(input, before, createdAt);
    const palateTypeId = scoringSame ? orig.palateTypeId : computePalateTypeId([...before, { ...input, createdAt }]);
    let photoUri = orig.photoUri;
    if (f.photoChanged && f.photo) {
      try {
        newPhoto = await persistPhoto(f.photo, orig.id, { version: Date.now().toString(36), width: f.photoWidth });
        photoUri = newPhoto;
      } catch {
        photoUri = orig.photoUri;
      }
    }
    await updateEntry({ ...orig, ...input, createdAt, photoUri, brew: brewOf(f), note: f.note.trim() || null, rating: f.rating, score: total, parts, palateTypeId });
    refreshReminder();
    return true;
  } catch {
    if (newPhoto && newPhoto !== orig.photoUri) discardPhoto(newPhoto); // yarım kalan yeni fotoğraf dosyası kalmasın
    return false;
  }
}
