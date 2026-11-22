import type { Method, TasteNote, VenueKind } from '../lib/types';

/**
 * Skor ve damak tipi ayarlarının TAMAMI burada.
 * Sayıları değiştirmek için sadece bu dosyayı düzenlemek yeterli.
 * Hedef: ortalama ~60, 90+ nadir.
 * Test raporu sonrası ayar (21 Kas): 100 sanal kullanıcı simülasyonunda eski ayarla ortalama 47 çıkıyordu.
 */
export const SCORING = {
  base: 40,
  effort: {
    home: 25, // Evde manuel demleme
    independent: 15, // Bağımsız / üçüncü dalga mekan
    chain: 10, // Zincir mekan (22 Kas: 5→10, zincirci kullanıcı cezalandırılmasın)
    office: 10, // Ofis makinesi / hazır
  } satisfies Record<VenueKind, number>,
  depth: {
    twoNotes: 5, // 2 tat notu girildi (detay modu) — brif: "küçük bonus", basit kullanan cezalandırılmaz
    origin: 5, // Menşei girildi (detay modu)
  },
  discovery: {
    newPlace: 15, // İlk kez gidilen mekan
    newPlacePerWeek: 2, // Yeni mekan puanı haftada en fazla bu kadar (uydurma mekan adıyla puan kasılmasın)
    newMethod: 10, // İlk kez denenen yöntem
    // Keşif tükenmesin (22 Kas): tekrar kazanılabilen küçük keşifler
    returnAfterDays: 30, // Bu kadar gündür gidilmeyen mekana dönüş...
    returnPlace: 5, // ...+5 "yeniden keşif"
    methodThisMonth: 5, // Bu ay ilk kez kullanılan (daha önce denenmiş) yöntem
  },
  selectivity: {
    sameChainStreakFrom: 3, // Aynı zincire art arda 3. ziyaret ve sonrası
    penalty: 0, // 22 Kas: ceza kaldırıldı (Müdavim rozetiyle çelişiyordu). Eski kayıtlarda -5 kalabilir.
  },
  max: 100,
  min: 0,
} as const;

/**
 * Cihazdaki küçük zincir listesi. Listede olmayan mekan bağımsız sayılır.
 * Eşleşme tam kelime bazlıdır ("Armado Kahve" Mado sayılmaz). Farklı yazımlar `aliases` içine.
 */
export const CHAINS: { name: string; aliases?: string[] }[] = [
  { name: 'Starbucks', aliases: ['starbuck'] },
  { name: "Gloria Jean's", aliases: ['gloria jeans', 'gloria'] },
  { name: 'Kahve Dünyası', aliases: ['kahvedunyasi'] },
  { name: 'Caribou', aliases: ['caribou coffee'] },
  { name: 'Espressolab', aliases: ['espresso lab'] },
  { name: 'Tchibo' },
  { name: 'Simit Sarayı', aliases: ['simitsarayi'] },
  { name: 'Costa', aliases: ['costa coffee'] },
  { name: 'Caffè Nero', aliases: ['nero', 'cafe nero', 'caffe nero'] },
  { name: 'Dunkin', aliases: ["dunkin donuts", 'dunkin coffee'] },
  { name: 'Mado' },
  { name: 'Big Chefs', aliases: ['bigchefs'] },
];

export const LEVELS: { min: number; label: string }[] = [
  { min: 90, label: 'Efsane' },
  { min: 75, label: 'Uzman' },
  { min: 60, label: 'Seçici' },
  { min: 40, label: 'Meraklı' },
  { min: 0, label: 'Çaylak' },
];

/**
 * Kullanıcı seviyesi: birikimli "kahve puanı" (tüm fincan skorlarının toplamı). Asla düşmez.
 * Ortalama 60 puanlı fincanla: Meraklı ~8, Seçici ~25, Uzman ~65, Efsane ~165 fincan.
 */
export const XP_LEVELS: { min: number; label: string }[] = [
  { min: 10000, label: 'Efsane' },
  { min: 4000, label: 'Uzman' },
  { min: 1500, label: 'Seçici' },
  { min: 500, label: 'Meraklı' },
  { min: 0, label: 'Çaylak' },
];

export type PalateType = {
  id: string;
  name: string;
  /** Kendini öven ama öz-ironili tek cümle. */
  tagline: string;
};

export const PALATE_TYPES: PalateType[] = [
  { id: 'floral_explorer', name: 'Floral Explorer', tagline: 'Fincanında çiçek bahçesi ararsın ve bazen gerçekten bulursun.' },
  { id: 'aroma_hunter', name: 'Aroma Avcısı', tagline: 'Koklamadan tek yudum almazsın; masadakiler bekler.' },
  { id: 'classic_master', name: 'Klasik Usta', tagline: 'Trendler gelip geçer, senin zevkin yerinden kıpırdamaz.' },
  { id: 'sweet_balancer', name: 'Tatlı Dengeci', tagline: 'Hayat yeterince acı, fincanın en azından tatlı olsun.' },
  { id: 'night_shift', name: 'Gece Vardiyası', tagline: 'Kahven gece kadar koyu, verimin de öyle (iddia).' },
  { id: 'acid_romantic', name: 'Asit Romantiği', tagline: 'Herkes "ekşi" der, sen "canlı asidite" dersin.' },
  { id: 'oat_milk_diplomat', name: 'Oat Milk Diplomatı', tagline: 'Sert sözlerden de sert kahveden de kaçınırsın; her masada barışı sen korursun.' },
  { id: 'pure_intensity', name: 'Saf Yoğunluk', tagline: 'Lafı uzatmazsın: tek shot, net karar.' },
  { id: 'foam_guardian', name: 'Köpük Muhafızı', tagline: 'Köpüksüz Türk kahvesi senin için küçük bir skandal.' },
  { id: 'cool_head', name: 'Soğuk Kafalı', tagline: 'Mevsim fark etmez, sen her koşulda serin kalırsın.' },
  { id: 'pourover_philosopher', name: 'Pour-over Filozofu', tagline: 'Su sıcaklığını derecesine kadar bilirsin; sormayan da öğrenir.' },
  { id: 'third_wave_nomad', name: 'Üçüncü Dalga Gezgini', tagline: 'Menüde "single origin" görünce adımların kendiliğinden yavaşlar.' },
  { id: 'cafe_nomad', name: 'Kafe Göçebesi', tagline: 'Aynı kafeye iki kez gitmek senin için neredeyse taahhüt.' },
];

/** Detay modu: en sık iki tat notu → tip (sıra önemsiz). */
export const NOTE_PAIR_TYPES: { notes: [TasteNote, TasteNote]; typeId: string }[] = [
  { notes: ['fruity', 'bright'], typeId: 'floral_explorer' },
  { notes: ['floral', 'fruity'], typeId: 'aroma_hunter' },
  { notes: ['chocolate', 'nutty'], typeId: 'classic_master' },
  { notes: ['caramel', 'chocolate'], typeId: 'sweet_balancer' },
  { notes: ['bold', 'chocolate'], typeId: 'night_shift' },
  { notes: ['bright', 'floral'], typeId: 'acid_romantic' },
];

/** Detay modu: eşleşen çift yoksa en sık tek nota göre tip. */
export const SINGLE_NOTE_TYPES: Record<TasteNote, string> = {
  fruity: 'floral_explorer',
  floral: 'aroma_hunter',
  chocolate: 'classic_master',
  nutty: 'classic_master',
  caramel: 'sweet_balancer',
  bright: 'acid_romantic',
  bold: 'pure_intensity',
};

/** Basit mod: en sık yönteme göre tip. Filtre için ev/dışarı ayrımı yapılır. */
export const METHOD_TYPES: Record<Exclude<Method, 'filter'>, string> & {
  filter: { home: string; out: string };
} = {
  espresso: 'pure_intensity',
  milk: 'oat_milk_diplomat',
  turkish: 'foam_guardian',
  coldbrew: 'cool_head',
  filter: { home: 'pourover_philosopher', out: 'third_wave_nomad' },
};

export const PALATE_RULES = {
  /** Damak tipi son kaç fincana bakarak hesaplanır. */
  window: 10,
  /** Kafe Göçebesi: son `nomadWindow` fincanda en az `nomadDistinctPlaces` farklı mekan. */
  nomadWindow: 6,
  nomadDistinctPlaces: 4,
  /** Tat notlarından tip: penceredeki fincanların en az bu oranında not olmalı. */
  notesShare: 0.4,
} as const;

/** Haftalık Damak Skoru: çeşitliliğe dayalı kişisel skor (kendi rekorunla kıyaslanır). */
export const WEEKLY = {
  perMethod: 12, // haftada denenen her farklı yöntem
  perPlace: 10, // haftada gidilen her farklı mekan
  perNote: 4, // haftada girilen her farklı tat notu
  perCup: 3, // her fincan
  maxCupsCounted: 7, // fincan puanı en fazla bu kadar fincan için
  max: 100,
  /** Kişisel hedef: bu hafta kaç yeni keşif (yeni mekan veya yöntem). */
  discoveryGoal: 2,
} as const;

/** description: kazanınca görünen metin · howTo: kilitliyken nasıl kazanılacağı */
export type Badge = { id: string; name: string; description: string; howTo: string };

/** Rozetler. Eşikler BADGE_RULES içinde. */
export const BADGES: Badge[] = [
  { id: 'routine', name: 'Sadık Fincan', description: '5 gün üst üste aynı yöntemden içtin. Yarın bir sürpriz?', howTo: '5 gün üst üste her gün aynı yöntemden en az bir fincan iç' },
  { id: 'third_wave_refugee', name: 'Kafe Kaşifi', description: '5 farklı bağımsız mekan gezdin.', howTo: '5 farklı bağımsız kafeye git' },
  { id: 'chain_loyal', name: 'Müdavim', description: 'Aynı zincire art arda 3 kez gittin. Sadakat güzel şey.', howTo: 'Aynı zincire art arda 3 kez git' },
  { id: 'pourover_patience', name: 'Ev Baristası', description: 'Evde 5 filtre kahve demledin.', howTo: 'Evde 5 filtre kahve demle' },
  { id: 'first_geisha', name: 'Geisha Anı', description: 'Geisha çekirdeğiyle tanıştın.', howTo: 'Bir Geisha çekirdeği dene (Detay > Çekirdek)' },
  { id: 'five_new_month', name: 'Şehir Gezgini', description: 'Bir ayda 5 yeni mekan keşfettin.', howTo: 'Bir ay içinde 5 yeni mekan keşfet' },
  { id: 'first_turkish', name: 'Fal Hazır', description: 'İlk Türk kahveni kaydettin. Fincanı kapatmayı unutma.', howTo: 'Bir Türk kahvesi kaydet' },
  { id: 'first_coldbrew', name: 'Buz Gibi', description: 'İlk soğuk demlemeni içtin.', howTo: 'Bir soğuk demleme kaydet' },
  { id: 'ten_places', name: 'Mekan Avcısı', description: '10 farklı mekanda kahve içtin.', howTo: '10 farklı mekanda kahve iç' },
  { id: 'streak30', name: 'Otuz Gün', description: '30 gün üst üste fincan ekledin. Bu artık bir alışkanlık.', howTo: '30 gün üst üste fincan ekle' },
  { id: 'hundred_cups', name: 'Yüzüncü Fincan', description: '100 fincanı geride bıraktın.', howTo: '100 fincan kaydet' },
  { id: 'depth', name: 'Tadım Defteri', description: '5 fincanı detaylı kaydettin: tat notu, menşei, tarif ya da kişisel not.', howTo: '5 fincanı detay moduyla kaydet' },
];

export const BADGE_RULES = {
  routineDays: 5,
  independentPlaces: 5,
  chainStreak: 3,
  homeFilters: 5,
  newPlacesInMonth: 5,
  detailedCups: 5,
  places: 10,
  streakDays: 30,
  cups: 100,
} as const;

/** Damak Özeti'ndeki "≈ X ml kahve" eğlenceli bilgisi için yaklaşık fincan hacimleri. */
export const CUP_VOLUME_ML: Record<Method, number> = {
  espresso: 40,
  filter: 250,
  coldbrew: 300,
  milk: 300,
  turkish: 70,
};

export const WRAPPED_RULES = {
  /** Evde içilen fincanların oranı bu eşiği geçerse "mekan" slaytı yerine "evin en iyi kafen" slaytı gösterilir. */
  homeShare: 0.5,
  /** Ana sayfada Damak Özeti afişi bu kadar fincandan sonra görünür. */
  minCupsForBanner: 3,
} as const;

/**
 * Ana sayfadaki kafein tahmini (mg, tek fincan için yaklaşık ortalamalar).
 * Sağlık tavsiyesi değildir; sadece fikir vermek için.
 */
export const CAFFEINE_MG: Record<Method, number> = {
  espresso: 63, // tek shot
  filter: 120, // ~240 ml demleme
  coldbrew: 150, // ~350 ml
  milk: 110, // latte/flat white (çoğunlukla çift shot)
  turkish: 60, // tek fincan
};

/** Ana sayfadaki küçük halkaların tavan puanları (Emek / Keşif / Derinlik). */
export const PART_MAX = { effort: 25, discovery: 25, depth: 10 } as const;
