/** Açık tema: kırık beyaz zemin, siyah büyük rakamlar, tek amber vurgu. */
export const colors = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  text: '#111111',
  muted: '#706A62', // zemin üstünde ≥4.5:1 kontrast
  tertiary: '#C4BEB6', // ok (chevron), yer tutucu metin
  mutedOnDark: '#CFC8BE', // koyu kart üstünde ikincil metin
  accentText: '#9C5F17', // turuncu METİN (bağlantı, geri) — accent dolgu/simge içindir
  line: '#ECE7E0',
  accent: '#D98B2B',
  accentSoft: '#F6E6D1',
  black: '#111111',
  white: '#FFFFFF',
  danger: '#C0392B',
};

export const radius = {
  card: 22,
  tile: 18,
  group: 14,
  pill: 999,
};

/** Ekran kenar ve üst boşlukları (tüm ekranlarda aynı). */
export const layout = { screenPad: 20, topPad: 8 };

export const space = (n: number) => n * 4;

/**
 * Kahve kimliği: büyük başlık ve rakamlarda sıcak, tırnaklı Fraunces yazı tipi (kökteki _layout yükler).
 * Özel yazı tipinde fontWeight verilmez; kalınlık dosyanın kendisinden gelir.
 */
export const fonts = {
  display: 'Fraunces_700Bold',
  heavy: 'Fraunces_800ExtraBold',
  semibold: 'Fraunces_600SemiBold',
};

/** Yazı ölçeği (Apple'ın Dynamic Type sıralamasına benzer). */
export const type = {
  largeTitle: { fontSize: 34, fontFamily: fonts.display, letterSpacing: -0.4, color: colors.text },
  title2: { fontSize: 22, fontFamily: fonts.display, letterSpacing: -0.2, color: colors.text },
  title3: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  headline: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 17, fontWeight: '400' as const, color: colors.text },
  subhead: { fontSize: 15, fontWeight: '400' as const, color: colors.muted },
  footnote: { fontSize: 13, fontWeight: '400' as const, color: colors.muted },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.muted },
  sectionHeader: { fontSize: 13, fontWeight: '600' as const, color: colors.muted, letterSpacing: 0.4 },
  display: { fontSize: 48, fontFamily: fonts.heavy, letterSpacing: -1, color: colors.text },
  stat: { fontSize: 28, fontFamily: fonts.display, color: colors.text },
};

/** iOS Ayarlar tarzı simge kutusu renkleri (marka paletinden). */
export const tint = {
  amber: '#D98B2B',
  espresso: '#2B1A12',
  cherry: '#B5402F',
  sage: '#5E7D5A',
  slate: '#5B6470',
  sky: '#3E7CB1',
};
