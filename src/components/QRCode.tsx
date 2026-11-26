import makeQR from 'qrcode-generator';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * QR kodu (SVG). Saf JS ile üretilir; yerel modül gerekmez.
 * Her koyu modül tek bir Path içinde küçük kare olarak çizilir (hızlı, keskin).
 */
export function QRCode({ value, size, color = '#111111', background = '#FFFFFF' }: { value: string; size: number; color?: string; background?: string }) {
  const { d, n } = useMemo(() => {
    const qr = makeQR(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c + 2},${r + 2}h1v1h-1z`;
    return { d: path, n: count + 4 }; // 2 modül sessiz alan (okunabilirlik için)
  }, [value]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} accessibilityLabel="QR kod">
      <Rect x={0} y={0} width={n} height={n} fill={background} />
      <Path d={d} fill={color} />
    </Svg>
  );
}
