import makeQR from 'qrcode-generator';
import { useMemo } from 'react';
import { View } from 'react-native';
import { LogoMark } from './LogoMark';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * QR kodu (SVG). Saf JS ile üretilir; yerel modül gerekmez.
 * logo: ortaya Cupped simgesi. Bunun için en yüksek hata düzeltme (H, kodun ~%30'u kapansa da okunur) kullanılır;
 * logo kenarının yaklaşık %22'si kadar (alanın ~%5'i) ve çevresinde beyaz boşlukla konur, okunabilirlik korunur.
 */
export function QRCode({
  value,
  size,
  color = '#111111',
  background = '#FFFFFF',
  logo = false,
}: {
  value: string;
  size: number;
  color?: string;
  background?: string;
  logo?: boolean;
}) {
  const { d, n } = useMemo(() => {
    const qr = makeQR(0, logo ? 'H' : 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c + 2},${r + 2}h1v1h-1z`;
    return { d: path, n: count + 4 }; // 2 modül sessiz alan (okunabilirlik için)
  }, [value, logo]);
  const logoSize = Math.round(size * 0.22);
  const pad = Math.round(size * 0.025);
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel="QR kod">
      <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`}>
        <Rect x={0} y={0} width={n} height={n} fill={background} />
        <Path d={d} fill={color} />
      </Svg>
      {logo ? (
        <View
          style={{
            position: 'absolute',
            left: (size - logoSize) / 2 - pad,
            top: (size - logoSize) / 2 - pad,
            padding: pad,
            borderRadius: logoSize * 0.28,
            backgroundColor: background,
          }}
        >
          <LogoMark size={logoSize} background="#D98B2B" radius={logoSize * 0.22} />
        </View>
      ) : null}
    </View>
  );
}
