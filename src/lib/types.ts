// Seçenek listeleri tek yerde: tür de buradan türetilir. Yeni bir yöntem/not eklenince her yer (formlar,
// kayıt doğrulama) birlikte güncellenir; doğrulamada unutulan seçenek yüzünden kayıt düşmez.
export const METHODS = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'] as const;
export type Method = (typeof METHODS)[number];

/** Kahvenin nereden geldiği; skorun "Emek" bileşenini belirler. */
export const VENUES = ['home', 'independent', 'chain', 'office'] as const;
export type VenueKind = (typeof VENUES)[number];

export const NOTES = ['fruity', 'floral', 'chocolate', 'nutty', 'caramel', 'bright', 'bold'] as const;
export type TasteNote = (typeof NOTES)[number];

export const GRINDS = ['fine', 'medium', 'coarse'] as const;
export type Grind = (typeof GRINDS)[number];

/** Detay modu: isteğe bağlı tarif bilgisi. */
/**
 * Fotoğrafta kahve kontrolünün sonucu (sadece ölçüm; skora etkisi yok).
 * coffee: kahve gibi ya da belirsiz · unsure: "kahveye benzemiyor" notu gösterildi · skipped: fotoğrafsız kayıt.
 * Kontrol bu cihazda çalışamadıysa (ör. Expo Go) alan yoktur/null.
 */
export const PHOTO_CHECKS = ['coffee', 'unsure', 'skipped'] as const;
export type PhotoCheck = (typeof PHOTO_CHECKS)[number];

export type Brew = {
  doseG: number | null; // kahve (gram)
  waterMl: number | null; // su (ml)
  grind: Grind | null;
};

export type ScoreParts = {
  base: number;
  effort: number;
  depth: number;
  discovery: number;
  selectivity: number;
};

export type ScoreResult = {
  total: number;
  parts: ScoreParts;
};

export type CupEntry = {
  id: string;
  createdAt: string; // ISO tarih
  photoUri: string | null;
  method: Method;
  /** Kullanıcının yazdığı mekan adı; evde/ofiste ise null. */
  placeName: string | null;
  venueKind: VenueKind;
  notes: TasteNote[];
  origin: string | null;
  /** Detay modu (eski kayıtlarda yok). */
  brew?: Brew | null;
  note?: string | null;
  /** Kişisel beğeni, 1-5 yıldız (uygulamanın skorundan ayrı). Verilmediyse yok/null. */
  rating?: number | null;
  /** H3 ölçümü: ekleme ekranının açılışından kayda kadar geçen süre (ms). */
  captureMs?: number | null;
  /** Fotoğrafta kahve kontrolü (eski kayıtlarda yok). */
  photoCheck?: PhotoCheck | null;
  score: number;
  parts: ScoreParts;
  palateTypeId: string;
};

/** Skor hesabına giren, henüz kaydedilmemiş fincan bilgisi. */
export type CupInput = Pick<CupEntry, 'method' | 'placeName' | 'venueKind' | 'notes' | 'origin'>;
