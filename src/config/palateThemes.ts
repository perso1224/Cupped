/**
 * Her damak tipinin kendi kart rengi: kart, tipi tek bakışta tanınan bir koleksiyon kartı gibi olsun.
 * Paylaşılan görsel olduğu için uygulamanın açık/koyu temasından bağımsızdır.
 * Hepsi aynı sıcak kahve ailesinden (mavi/mor yok); yazı/zemin kontrastı ≥ 4.5:1.
 */
export type CardTheme = { bg: string; fg: string; muted: string; accent: string };

export const PALATE_THEMES: Record<string, CardTheme> = {
  floral_explorer: { bg: '#F3E1DA', fg: '#3A1E1A', muted: '#77493F', accent: '#B5402F' },
  aroma_hunter: { bg: '#33201F', fg: '#F7EADF', muted: '#CDB4A6', accent: '#E3A43A' },
  classic_master: { bg: '#2B1A12', fg: '#F6EBDD', muted: '#CDBBA6', accent: '#D98B2B' },
  sweet_balancer: { bg: '#F1E3CF', fg: '#2B1A12', muted: '#6E5844', accent: '#A85F1F' },
  night_shift: { bg: '#17120F', fg: '#F5EDE3', muted: '#A89C90', accent: '#D98B2B' },
  acid_romantic: { bg: '#F3D58A', fg: '#2D2410', muted: '#5E4A1E', accent: '#9A3D18' },
  oat_milk_diplomat: { bg: '#ECE2CF', fg: '#3A3226', muted: '#6B5F50', accent: '#7E6343' },
  pure_intensity: { bg: '#170E0A', fg: '#FFFFFF', muted: '#BFAFA4', accent: '#E4572E' },
  foam_guardian: { bg: '#6B2E1F', fg: '#FBEBD9', muted: '#E8C9B2', accent: '#E8B04B' },
  cool_head: { bg: '#24352B', fg: '#EEF2E8', muted: '#B3C4AE', accent: '#E3A43A' },
  pourover_philosopher: { bg: '#E4E8DA', fg: '#1F2E22', muted: '#4F5F49', accent: '#46703F' },
  third_wave_nomad: { bg: '#9E3526', fg: '#FFF4EC', muted: '#FAD7C8', accent: '#FFD2A8' },
  cafe_nomad: { bg: '#D98B2B', fg: '#1A120B', muted: '#3F2910', accent: '#2B1A12' },
};

export const DEFAULT_CARD_THEME: CardTheme = PALATE_THEMES.classic_master;

export function cardTheme(typeId: string | null | undefined): CardTheme {
  return (typeId && PALATE_THEMES[typeId]) || DEFAULT_CARD_THEME;
}
