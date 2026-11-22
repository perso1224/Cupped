/**
 * Her damak tipinin kendi kart rengi: kart, tipi tek bakışta tanınan bir koleksiyon kartı gibi olsun.
 * Paylaşılan görsel olduğu için uygulamanın açık/koyu temasından bağımsızdır.
 */
export type CardTheme = { bg: string; fg: string; muted: string; accent: string };

export const PALATE_THEMES: Record<string, CardTheme> = {
  floral_explorer: { bg: '#F2D7DA', fg: '#3B1F2B', muted: '#7A5562', accent: '#B5405F' },
  aroma_hunter: { bg: '#2F2A48', fg: '#F3EEFF', muted: '#B8AED6', accent: '#E3A43A' },
  classic_master: { bg: '#2B1A12', fg: '#F6EBDD', muted: '#CDBBA6', accent: '#D98B2B' },
  sweet_balancer: { bg: '#F1E3CF', fg: '#2B1A12', muted: '#7A6450', accent: '#C0702A' },
  night_shift: { bg: '#121212', fg: '#F5F0E8', muted: '#9C968E', accent: '#8FB4FF' },
  acid_romantic: { bg: '#F5DC7A', fg: '#2D2410', muted: '#6E5C2A', accent: '#C2410C' },
  oat_milk_diplomat: { bg: '#ECE2CF', fg: '#3A3226', muted: '#7D7060', accent: '#8A6E4B' },
  pure_intensity: { bg: '#170E0A', fg: '#FFFFFF', muted: '#BFAFA4', accent: '#E4572E' },
  foam_guardian: { bg: '#6B2E1F', fg: '#FBEBD9', muted: '#E0BFA6', accent: '#E8B04B' },
  cool_head: { bg: '#1F3A4D', fg: '#E6F2F8', muted: '#A4C2D2', accent: '#7CC3E6' },
  pourover_philosopher: { bg: '#E4ECE1', fg: '#1F2E22', muted: '#5D6E5F', accent: '#4F7A4B' },
  third_wave_nomad: { bg: '#B5402F', fg: '#FFF4EC', muted: '#F2C7B6', accent: '#F6C89F' },
  cafe_nomad: { bg: '#D98B2B', fg: '#1A120B', muted: '#5E3E1A', accent: '#2B1A12' },
};

export const DEFAULT_CARD_THEME: CardTheme = PALATE_THEMES.classic_master;

export function cardTheme(typeId: string | null | undefined): CardTheme {
  return (typeId && PALATE_THEMES[typeId]) || DEFAULT_CARD_THEME;
}
