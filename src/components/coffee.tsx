import { useEffect, useState } from 'react';
import { Animated, Easing, View, type ColorValue } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { colors, tint } from '../theme';
import { reduceMotionNow } from './motion';

// Fincan gövdesi (viewBox 100): ağız y=32, düz duvarlar y=74'e kadar, yuvarlak dip y=82.
const BODY = 'M22 32 H78 L73 74 Q72 82 64 82 H36 Q28 82 27 74 Z';
const MOUTH = 34; // kahvenin en fazla çıktığı yer
const WALL_END = 74;
const xl = (y: number) => 22 + (5 * (y - 32)) / 42;
const xr = (y: number) => 78 - (5 * (y - 32)) / 42;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Kahvenin şekli: gövdenin y=t çizgisinin altında kalan kısmı (kırpma yok; her platformda aynı çizilir).
 * Seviye düz duvar bölgesinde tutulur, böylece şekil hep fincanın içinde kalır.
 */
function liquidPath(t: number) {
  return `M${r1(xl(t))} ${r1(t)} H${r1(xr(t))} L73 74 Q72 82 64 82 H36 Q28 82 27 74 Z`;
}
function cremaPath(t: number) {
  const b = Math.min(WALL_END, t + 3.5);
  return `M${r1(xl(t))} ${r1(t)} H${r1(xr(t))} L${r1(xr(b))} ${r1(b)} H${r1(xl(b))} Z`;
}

/** Cupped'ın kendi göstergesi: skor arttıkça fincan kahveyle dolar (halka yerine). */
export function CupGauge({ fraction, size = 96, animate = false, onDark = false }: { fraction: number; size?: number; animate?: boolean; onDark?: boolean }) {
  // Koyu zeminde (menü tahtası) krem çizgi; açık zeminde metin rengi.
  const ink = onDark ? '#F6EBDD' : colors.text;
  const cupFill = onDark ? '#3A281D' : colors.card;
  const saucer = onDark ? 'rgba(246,235,221,0.15)' : colors.line;
  const coffee = onDark ? '#7A4A2A' : '#2B1A12';
  const f = Math.max(0, Math.min(1, fraction));
  const animated = animate && !reduceMotionNow();
  const [anim, setLevel] = useState(0);
  useEffect(() => {
    if (!animated) return;
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setLevel(value));
    const anim = Animated.timing(v, { toValue: f, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => {
      anim.stop();
      v.removeListener(id);
    };
  }, [f, animated]);
  const level = animated ? anim : f;
  // 0 → dipte ince bir katman (y=72), 1 → ağız (y=34)
  const t = WALL_END - 2 - level * (WALL_END - 2 - MOUTH);

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Buhar: fincanda kahve varsa */}
        {f > 0 ? (
          <G stroke={colors.accent} strokeOpacity={onDark ? 0.55 : 0.45} strokeWidth={3} strokeLinecap="round" fill="none">
            <Path d="M42 24 C39 19 45 16 42 10" />
            <Path d="M58 24 C55 19 61 16 58 10" />
          </G>
        ) : null}
        <Ellipse cx={50} cy={88} rx={38} ry={5} fill={saucer} />
        <Path d={BODY} fill={cupFill} />
        {level > 0.001 ? (
          <>
            <Path d={liquidPath(t)} fill={coffee} />
            <Path d={cremaPath(t)} fill={colors.accent} />
          </>
        ) : null}
        <Path d="M77 42 Q92 42 90 56 Q88 68 74 66" stroke={ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <Path d={BODY} stroke={ink} strokeWidth={3.5} fill="none" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** Kahve çekirdeği simgesi (seri göstergesi; alev yerine). */
export function Bean({ size = 18, color = tint.espresso, line = colors.onColor }: { size?: number; color?: ColorValue; line?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G transform="rotate(35 12 12)">
        <Ellipse cx={12} cy={12} rx={7} ry={10} fill={color} />
        <Path d="M12.6 4.6 C9.6 8.4 14.6 11.6 11.8 15.4 C10.9 16.8 11 18.2 11.6 19.4" stroke={line} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      </G>
    </Svg>
  );
}
