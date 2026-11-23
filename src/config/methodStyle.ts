import type { IconName } from '../components/Icon';
import type { Method } from '../lib/types';
import { isDark, tint } from '../theme';

/** Her yöntemin simgesi ve mürekkep rengi (Pasaport damgaları, fincan listeleri, yöntem sayfası). */
export const METHOD_ICON: Record<Method, IconName> = {
  espresso: 'cafe',
  filter: 'funnel',
  coldbrew: 'snow',
  milk: 'water',
  turkish: 'flame',
};

// Koyu temada koyu kahve ve arduvaz mürekkep zeminde kaybolur: daha açık tonlar
export const METHOD_INK: Record<Method, string> = {
  espresso: isDark ? '#C08A62' : tint.espresso,
  filter: tint.amber,
  coldbrew: isDark ? '#6FA3D1' : tint.sky,
  milk: isDark ? '#A3ACB8' : tint.slate,
  turkish: isDark ? '#D6705C' : tint.cherry,
};

/** "#RRGGBB" + opaklık → rgba (yumuşak zeminler için). */
export function soft(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
