// Marka adı tek yerden değişir.
export const BRAND = {
  name: 'Cupped',
  // App Store linki yayından sonra doldurulacak.
  storeUrl: '',
} as const;

/**
 * Instagram Hikayesi'ne doğrudan paylaşım. Instagram, paylaşan uygulamanın Meta (Facebook) uygulama kimliğini ister.
 * Kimlik: developers.facebook.com → Uygulamalarım → uygulama → Uygulama Kimliği (yalnızca rakamlar).
 * Boşken bu seçenek görünmez; paylaşım her zamanki paylaşım menüsüyle yapılır.
 * Bu bir sır değildir (her paylaşımda Instagram'a gönderilir); kodda durabilir ve anlık güncellemeyle değiştirilebilir.
 */
export const INSTAGRAM = {
  appId: '',
} as const;

/** Açılıp kapatılabilen bölümler. */
export const FEATURES = {
  /** Cupped Kulüp tanıtım kartı (Profil). Kurucu kararıyla askıda (22 Kas). true yapınca geri gelir. */
  club: false,
} as const;
