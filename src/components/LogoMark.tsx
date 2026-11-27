import type { ColorValue } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

/**
 * Cupped logosu, vektör olarak: her boyutta ve her ekranda keskin (görsel büyütülünce kırılan pikseller yok).
 * Ölçüler uygulama simgesinden (assets/icon.png, 1024 px) alt piksel hassasiyetiyle ölçüldü; orta ve iç halkanın
 * hafif sağa kayıklığı logonun kendisinde olduğu gibi korunur.
 */
const C = 511.66; // dış halka ve noktanın merkezi
const RINGS = [
  { cx: C, cy: C, r: 386.66, w: 46 },
  { cx: 532, cy: C, r: 299.5, w: 35.8 },
  { cx: 532, cy: C, r: 211.1, w: 28.5 },
];
const DOT = 102.35;
// Dış halkanın dış kenarı: kırpılmış görünümde halkalar kutuyu tam doldurur
const EDGE = 386.66 + 23;

export function LogoMark({
  size,
  color = '#111111',
  dot = true,
  background,
  radius = 0,
}: {
  size: number;
  color?: ColorValue;
  /** Ortadaki nokta (açılışta ayrıca canlandırıldığı için kapatılabilir) */
  dot?: boolean;
  /** Verilirse uygulama simgesi gibi dolu kare zemin (QR ortası); yoksa yalnızca halkalar, kutuyu doldurur */
  background?: ColorValue;
  radius?: number;
}) {
  const vb = background ? '0 0 1024 1024' : `${C - EDGE} ${C - EDGE} ${EDGE * 2} ${EDGE * 2}`;
  return (
    <Svg width={size} height={size} viewBox={vb} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {background ? <Rect x={0} y={0} width={1024} height={1024} rx={radius * (1024 / size)} fill={background} /> : null}
      {RINGS.map((r) => (
        <Circle key={r.r} cx={r.cx} cy={r.cy} r={r.r} stroke={color} strokeWidth={r.w} fill="none" />
      ))}
      {dot ? <Circle cx={C} cy={C} r={DOT} fill={color} /> : null}
    </Svg>
  );
}
