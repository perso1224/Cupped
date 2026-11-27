import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Method } from '../lib/types';

/**
 * Cupped'ın kendi çizgi simgeleri: 24'lük ızgara, 2 birim çizgi, yuvarlak uçlar.
 * Hazır simgeler (huni, alev, damla) yerine kahveye özgü çizimler; hepsi aynı elden çıkmış gibi.
 */
export type GlyphName = 'v60' | 'espresso' | 'coldbrew' | 'latte' | 'cezve' | 'effort' | 'discovery' | 'depth';

const PATHS: Record<GlyphName, string[]> = {
  // Demlik konisi, boyun ve altında sürahi tabanı
  v60: ['M4 5H20L14.5 13.5H9.5Z', 'M10 13.5V16H14V13.5', 'M6.5 19.5H17.5'],
  // Küçük fincan, kulp, tabak
  espresso: ['M6 8.5H16V12.5A5 5 0 0 1 11 17.5A5 5 0 0 1 6 12.5Z', 'M16 10H17.5A2.25 2.25 0 0 1 17.5 14.5H16', 'M4 20.5H18'],
  // Uzun bardak, buz küpleri, pipet
  coldbrew: ['M6.5 5H17.5L16.1 19.3A2 2 0 0 1 14.1 21H9.9A2 2 0 0 1 7.9 19.3Z', 'M8.8 9.2H11.6V12H8.8Z', 'M12.2 13.4H14.8V16H12.2Z', 'M14 5L16 2'],
  // Bardakta katmanlı sütlü kahve
  latte: ['M6.5 4H17.5L16.2 19.4A1.8 1.8 0 0 1 14.4 21H9.6A1.8 1.8 0 0 1 7.8 19.4Z', 'M7.1 10.5H16.9', 'M7.6 14.5C9.1 13.5 10.6 15.5 12 14.5C13.4 13.5 14.9 15.5 16.4 14.5'],
  // Cezve: geniş gövde, dar boyun, uzun sap
  cezve: ['M4.5 6H13.5', 'M5.5 6L6.8 9.5L4 17.6A2.4 2.4 0 0 0 6.3 20.5H11.7A2.4 2.4 0 0 0 14 17.6L11.2 9.5L12.5 6', 'M12.4 11.5L21 9'],
  // Emek: kronometre
  effort: ['M12 13.5V10', 'M10 3H14', 'M12 3V5.5', 'M17.5 7.5L18.8 6.2'],
  // Keşif: pusula iğnesi (çember ayrıca çizilir)
  discovery: ['M15 9L13.2 13.2L9 15L10.8 10.8Z'],
  // Derinlik: üst üste katmanlar
  depth: ['M12 4L20 8L12 12L4 8Z', 'M4 12L12 16L20 12', 'M4 16L12 20L20 16'],
};

const CIRCLES: Partial<Record<GlyphName, { cx: number; cy: number; r: number }>> = {
  effort: { cx: 12, cy: 13.5, r: 7.5 },
  discovery: { cx: 12, cy: 12, r: 8.5 },
};

export function Glyph({ name, size = 22, color, strokeWidth = 2 }: { name: GlyphName; size?: number; color: ColorValue; strokeWidth?: number }) {
  const c = CIRCLES[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {c ? <Circle cx={c.cx} cy={c.cy} r={c.r} stroke={color} strokeWidth={strokeWidth} /> : null}
      {PATHS[name].map((d) => (
        <Path key={d} d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

export const METHOD_GLYPH: Record<Method, GlyphName> = {
  filter: 'v60',
  espresso: 'espresso',
  coldbrew: 'coldbrew',
  milk: 'latte',
  turkish: 'cezve',
};

/** Yöntem simgesi (fincan listeleri, Pasaport, Yöntemler). */
export function MethodGlyph({ method, size = 22, color, strokeWidth }: { method: Method; size?: number; color: ColorValue; strokeWidth?: number }) {
  return <Glyph name={METHOD_GLYPH[method]} size={size} color={color} strokeWidth={strokeWidth} />;
}
