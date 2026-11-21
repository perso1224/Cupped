/** Açık tema: kırık beyaz zemin, siyah büyük rakamlar, tek amber vurgu. */
export const colors = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  text: '#111111',
  muted: '#7A746C',
  line: '#ECE7E0',
  accent: '#D98B2B',
  accentSoft: '#F6E6D1',
  black: '#111111',
  white: '#FFFFFF',
  danger: '#C0392B',
};

export const radius = {
  card: 22,
  pill: 999,
};

export const space = (n: number) => n * 4;

/** Yazı ölçeği (Apple'ın Dynamic Type sıralamasına benzer). */
export const type = {
  largeTitle: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.6, color: colors.text },
  title2: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, color: colors.text },
  title3: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  headline: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 17, fontWeight: '400' as const, color: colors.text },
  subhead: { fontSize: 15, fontWeight: '400' as const, color: colors.muted },
  footnote: { fontSize: 13, fontWeight: '400' as const, color: colors.muted },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.muted },
  sectionHeader: { fontSize: 13, fontWeight: '600' as const, color: colors.muted, letterSpacing: 0.4 },
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
