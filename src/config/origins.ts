/**
 * Fincan eklerken "Çekirdek" seçicisinin listesi: dünyadaki kahve yetiştiren ülkeler ve bilinen bölgeleri,
 * kahve çeşitleri (varyete) ve türleri. Seçim, fincandaki menşei metnine yazılır (veri yapısı değişmez).
 */

export type OriginCountry = { name: string; regions: string[] };
export type OriginGroup = { title: string; countries: OriginCountry[] };

export const ORIGIN_GROUPS: OriginGroup[] = [
  {
    title: 'Afrika',
    countries: [
      { name: 'Etiyopya', regions: ['Yirgacheffe', 'Sidama', 'Guji', 'Harrar', 'Limu', 'Jimma', 'Kaffa', 'Gera', 'Bench Maji', 'Lekempti'] },
      { name: 'Kenya', regions: ['Nyeri', 'Kirinyaga', "Murang'a", 'Embu', 'Kiambu', 'Meru'] },
      { name: 'Ruanda', regions: ['Nyamasheke', 'Huye', 'Gakenke', 'Rutsiro'] },
      { name: 'Burundi', regions: ['Kayanza', 'Ngozi', 'Muramvya'] },
      { name: 'Tanzanya', regions: ['Kilimanjaro', 'Arusha', 'Mbeya'] },
      { name: 'Uganda', regions: ['Elgon Dağı', 'Rwenzori'] },
      { name: 'Kongo DC', regions: ['Kivu'] },
      { name: 'Malavi', regions: [] },
      { name: 'Zambiya', regions: [] },
      { name: 'Zimbabve', regions: [] },
      { name: 'Kamerun', regions: [] },
      { name: 'Fildişi Sahili', regions: [] },
    ],
  },
  {
    title: 'Orta Doğu',
    countries: [{ name: 'Yemen', regions: ['Haraz', 'Bani Matar', 'Mocha'] }],
  },
  {
    title: 'Orta Amerika ve Karayipler',
    countries: [
      { name: 'Panama', regions: ['Boquete', 'Volcán', 'Renacimiento'] },
      { name: 'Kosta Rika', regions: ['Tarrazú', 'West Valley', 'Central Valley', 'Tres Ríos', 'Brunca'] },
      { name: 'Guatemala', regions: ['Antigua', 'Huehuetenango', 'Atitlán', 'Acatenango', 'Cobán', 'Fraijanes'] },
      { name: 'Honduras', regions: ['Marcala', 'Santa Bárbara', 'Copán', 'Opalaca'] },
      { name: 'El Salvador', regions: ['Santa Ana', 'Apaneca-Ilamatepec', 'Chalatenango'] },
      { name: 'Nikaragua', regions: ['Jinotega', 'Matagalpa', 'Nueva Segovia'] },
      { name: 'Meksika', regions: ['Chiapas', 'Oaxaca', 'Veracruz'] },
      { name: 'Jamaika', regions: ['Blue Mountain'] },
      { name: 'Hawaii (ABD)', regions: ['Kona', "Ka'u"] },
      { name: 'Dominik Cumhuriyeti', regions: [] },
      { name: 'Haiti', regions: [] },
      { name: 'Küba', regions: [] },
      { name: 'Porto Riko', regions: [] },
    ],
  },
  {
    title: 'Güney Amerika',
    countries: [
      { name: 'Kolombiya', regions: ['Huila', 'Nariño', 'Cauca', 'Tolima', 'Antioquia', 'Quindío', 'Santander', 'Sierra Nevada'] },
      { name: 'Brezilya', regions: ['Cerrado Mineiro', 'Sul de Minas', 'Mogiana', 'Chapada Diamantina', 'Espírito Santo'] },
      { name: 'Peru', regions: ['Cajamarca', 'Cusco', 'Junín', 'Amazonas', 'Puno'] },
      { name: 'Ekvador', regions: ['Loja', 'Pichincha', 'Zamora-Chinchipe'] },
      { name: 'Bolivya', regions: ['Yungas', 'Caranavi'] },
      { name: 'Venezuela', regions: [] },
    ],
  },
  {
    title: 'Asya ve Pasifik',
    countries: [
      { name: 'Endonezya', regions: ['Sumatra Mandheling', 'Aceh Gayo', 'Sulawesi Toraja', 'Java', 'Bali Kintamani', 'Flores'] },
      { name: 'Hindistan', regions: ['Monsooned Malabar', 'Chikmagalur', 'Coorg', 'Araku'] },
      { name: 'Vietnam', regions: ['Da Lat', 'Buôn Ma Thuột'] },
      { name: 'Papua Yeni Gine', regions: ['Eastern Highlands', 'Western Highlands'] },
      { name: 'Tayland', regions: ['Chiang Rai', 'Doi Chang'] },
      { name: 'Çin', regions: ['Yunnan'] },
      { name: 'Myanmar', regions: ['Shan'] },
      { name: 'Laos', regions: ['Bolaven Platosu'] },
      { name: 'Doğu Timor', regions: [] },
      { name: 'Filipinler', regions: [] },
      { name: 'Tayvan', regions: ['Alishan'] },
    ],
  },
];

/** Kahve çeşitleri (varyete). "Geisha" adı, Geisha rozeti metinde "geisha" aradığı için bu yazımla tutulur. */
export const VARIETIES: string[] = [
  'Geisha (Gesha)',
  'Bourbon',
  'Pink Bourbon',
  'Sarı Bourbon',
  'Typica',
  'Caturra',
  'Catuaí',
  'Pacamara',
  'Pacas',
  'SL28',
  'SL34',
  'Ruiru 11',
  'Batian',
  'Maragogype',
  'Mundo Novo',
  'Villa Sarchi',
  'Sidra',
  'Wush Wush',
  'Etiyopya yerel (heirloom)',
  'Castillo',
  'Catimor',
  'Sarchimor',
  'Java',
  'Laurina',
];

/** Kahve türleri. */
export const SPECIES: string[] = ['Arabica', 'Robusta', 'Liberica', 'Excelsa', 'Harman (blend)'];

/** Seçici listesinin düz hali: her satır bir seçenek. */
export type OriginOption = { label: string; kind: 'origin' | 'variety'; sub?: string; region?: boolean };

export function originOptions(): { title: string; data: OriginOption[] }[] {
  return [
    ...ORIGIN_GROUPS.map((g) => ({
      title: g.title,
      data: g.countries.flatMap((c) => [
        { label: c.name, kind: 'origin' as const, sub: c.regions.length ? `${c.regions.length} bölge` : undefined },
        ...c.regions.map((r) => ({ label: `${c.name} ${r}`, kind: 'origin' as const, region: true })),
      ]),
    })),
    { title: 'Çeşitler', data: VARIETIES.map((v) => ({ label: v, kind: 'variety' as const })) },
    { title: 'Türler', data: SPECIES.map((v) => ({ label: v, kind: 'variety' as const })) },
  ];
}

const SEP = ' · ';

/**
 * Seçimi mevcut menşei metniyle birleştirir: menşei + çeşit "Panama Boquete · Geisha (Gesha)" gibi yan yana durur.
 * Menşei seçilirse varsa çeşit korunur; çeşit seçilirse varsa menşei korunur.
 */
export function applyOrigin(current: string, pick: OriginOption): string {
  const [origin = '', variety = ''] = current.split(SEP).map((s) => s.trim());
  const next = pick.kind === 'origin' ? [pick.label, variety] : [origin, pick.label];
  return next.filter(Boolean).join(SEP).slice(0, 80);
}

const norm = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i');

/** Aramaya göre filtreler (büyük/küçük harf ve aksan duyarsız: "tarrazu" → "Tarrazú"). */
export function filterOrigins(sections: { title: string; data: OriginOption[] }[], query: string) {
  const q = norm(query.trim());
  if (!q) return sections;
  return sections.map((s) => ({ ...s, data: s.data.filter((o) => norm(o.label).includes(q)) })).filter((s) => s.data.length);
}
