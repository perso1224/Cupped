// Marka adı tek yerden değişir.
export const BRAND = {
  name: 'Cupped',
  // App Store linki yayından sonra doldurulacak.
  storeUrl: '',
} as const;

/** Açılıp kapatılabilen bölümler. */
export const FEATURES = {
  /** Cupped Kulüp tanıtım kartı (Profil). Kurucu kararıyla askıda (22 Kas). true yapınca geri gelir. */
  club: false,
} as const;
