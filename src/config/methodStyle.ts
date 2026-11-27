import type { Method } from '../lib/types';
import { isDark } from '../theme';

/**
 * Her yöntemin rengi (Yöntemler sayfasındaki simge kutusu). Yalnızca marka ailesi: kehribar, kavrum,
 * adaçayı, karamel, vişne. Simgeler `components/Glyph` içinde (METHOD_GLYPH).
 */
export const METHOD_INK: Record<Method, string> = {
  espresso: isDark ? '#C08A62' : '#2B1A12',
  filter: '#D98B2B',
  coldbrew: isDark ? '#8FB08A' : '#5E7D5A',
  milk: isDark ? '#C98E5E' : '#A0673A',
  turkish: isDark ? '#D6705C' : '#B5402F',
};

/** "#RRGGBB" + opaklık → rgba (yumuşak zeminler için). */
export function soft(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
