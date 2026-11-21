export type Method = 'espresso' | 'filter' | 'coldbrew' | 'milk' | 'turkish';

/** Kahvenin nereden geldiği; skorun "Emek" bileşenini belirler. */
export type VenueKind = 'home' | 'independent' | 'chain' | 'office';

export type TasteNote =
  | 'fruity'
  | 'floral'
  | 'chocolate'
  | 'nutty'
  | 'caramel'
  | 'bright'
  | 'bold';

export type Grind = 'fine' | 'medium' | 'coarse';

/** Detay modu: isteğe bağlı tarif bilgisi. */
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
  /** H3 ölçümü: ekleme ekranının açılışından kayda kadar geçen süre (ms). */
  captureMs?: number | null;
  score: number;
  parts: ScoreParts;
  palateTypeId: string;
};

/** Skor hesabına giren, henüz kaydedilmemiş fincan bilgisi. */
export type CupInput = Pick<CupEntry, 'method' | 'placeName' | 'venueKind' | 'notes' | 'origin'>;
