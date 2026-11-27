import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors, isDark } from '../theme';
import { haptic, reduceMotionNow } from './motion';

/**
 * Rozet simgeleri: Cupped simge takımıyla aynı kural (24'lük ızgara, 2 birim çizgi, yuvarlak uçlar).
 * Her parça bir yol; `rot` verilirse ortanın çevresinde döndürülür, `c` verilirse çember.
 */
type Part = { d?: string; c?: [number, number, number]; rot?: number };
const PETAL = 'M12 10 C9.6 7.4 10.2 3.8 12 3.8 C13.8 3.8 14.4 7.4 12 10 Z';
const BADGE_GLYPHS: Record<string, Part[]> = {
  // Sadık Fincan: tikli takvim
  routine: [{ d: 'M6 5H18A2 2 0 0 1 20 7V18A2 2 0 0 1 18 20H6A2 2 0 0 1 4 18V7A2 2 0 0 1 6 5Z' }, { d: 'M4 9.5H20' }, { d: 'M8.5 3V6.5' }, { d: 'M15.5 3V6.5' }, { d: 'M9 14.5L11 16.5L15 12.5' }],
  // Kafe Kaşifi: tenteli kafe
  third_wave_refugee: [{ d: 'M4 9L5.5 4H18.5L20 9' }, { d: 'M4 9A2 2 0 0 0 8 9A2 2 0 0 0 12 9A2 2 0 0 0 16 9A2 2 0 0 0 20 9' }, { d: 'M5.5 11.5V20H18.5V11.5' }, { d: 'M10 20V15.5H14V20' }],
  // Müdavim: tekrar okları
  chain_loyal: [{ d: 'M17 3.5L20 6.5L17 9.5' }, { d: 'M4 11.5V10A3.5 3.5 0 0 1 7.5 6.5H20' }, { d: 'M7 20.5L4 17.5L7 14.5' }, { d: 'M20 12.5V14A3.5 3.5 0 0 1 16.5 17.5H4' }],
  // Ev Baristası: kuğu boyunlu demleme ibriği
  pourover_patience: [{ d: 'M6.5 10H15.5L14.6 18.8A1.5 1.5 0 0 1 13.1 20H8.9A1.5 1.5 0 0 1 7.4 18.8Z' }, { d: 'M8.5 10V8.5H13.5V10' }, { d: 'M11 8.5V7' }, { d: 'M15.2 12.5C18.5 12.5 18.5 7.5 21 6' }, { d: 'M6.6 11.5C3.6 12 3.6 17 7 17.5' }],
  // Geisha Anı: yasemin çiçeği
  first_geisha: [...[0, 72, 144, 216, 288].map((rot): Part => ({ d: PETAL, rot })), { c: [12, 12, 1.6] }],
  // Şehir Gezgini: konum iğnesi
  five_new_month: [{ d: 'M12 21C12 21 5.5 15 5.5 10A6.5 6.5 0 0 1 18.5 10C18.5 15 12 21 12 21Z' }, { c: [12, 10, 2.4] }],
  // Tadım Defteri: defter
  depth: [{ d: 'M6.5 3H17.5A1.5 1.5 0 0 1 19 4.5V19.5A1.5 1.5 0 0 1 17.5 21H6.5A1.5 1.5 0 0 1 5 19.5V4.5A1.5 1.5 0 0 1 6.5 3Z' }, { d: 'M9 3V21' }, { d: 'M12 8H16' }, { d: 'M12 11.5H16' }],
  // Fal Hazır: cezve
  first_turkish: [{ d: 'M4.5 6H13.5' }, { d: 'M5.5 6L6.8 9.5L4 17.6A2.4 2.4 0 0 0 6.3 20.5H11.7A2.4 2.4 0 0 0 14 17.6L11.2 9.5L12.5 6' }, { d: 'M12.4 11.5L21 9' }],
  // Buz Gibi: buz küpü
  first_coldbrew: [{ d: 'M12 3L20 7.5V16.5L12 21L4 16.5V7.5Z' }, { d: 'M4 7.5L12 12L20 7.5' }, { d: 'M12 12V21' }],
  // Mekan Avcısı: bayrak
  ten_places: [{ d: 'M6 21V3.5' }, { d: 'M6 4.5H17.5L15 8.25L17.5 12H6' }],
  // Otuz Gün: kahve çekirdeği (uygulamadaki seri simgesi)
  streak30: [
    { d: 'M12 3C16.4 3 18.5 7.5 18.5 12C18.5 16.5 16.4 21 12 21C7.6 21 5.5 16.5 5.5 12C5.5 7.5 7.6 3 12 3Z', rot: 35 },
    { d: 'M12.7 5.6C9.8 9.2 14.4 11.8 11.7 15.6C11 16.7 11.1 17.7 11.5 18.5', rot: 35 },
  ],
  // Yüzüncü Fincan: kupa
  hundred_cups: [{ d: 'M8 4H16V9A4 4 0 0 1 8 9Z' }, { d: 'M8 5.5H6A2.25 2.25 0 0 0 7.6 9.8' }, { d: 'M16 5.5H18A2.25 2.25 0 0 1 16.4 9.8' }, { d: 'M12 13V17' }, { d: 'M8.5 20.5H15.5' }, { d: 'M9.5 17H14.5V20.5H9.5Z' }],
};

/** Rozet renkleri: tek çerçeve, tek palet (kehribar halka, krem zemin, kavrum simge). */
const EARNED = isDark ? { disc: '#3B2A19', ring: '#D98B2B', ink: '#F3ECE4' } : { disc: '#F6E6D1', ring: '#D98B2B', ink: '#2B1A12' };

/**
 * Rozet görseli. Kazanılmadıysa aynı simgenin gri, yalnızca çizgili hâli (ne olduğu belli, ama sönük).
 */
export function BadgeArt({ id, earned, size = 56 }: { id: string; earned: boolean; size?: number }) {
  const parts = BADGE_GLYPHS[id] ?? BADGE_GLYPHS.hundred_cups;
  const ring = earned ? EARNED.ring : colors.line;
  const ink = earned ? EARNED.ink : colors.tertiary;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={30.5} fill={earned ? EARNED.disc : 'none'} stroke={ring} strokeWidth={earned ? 2.5 : 1.5} />
        {earned ? <Circle cx={32} cy={32} r={26} fill="none" stroke={ring} strokeWidth={1} opacity={0.45} /> : null}
        {/* 24lük simge ortada ~32 birime ölçeklenir */}
        <G transform="translate(15.8 15.8) scale(1.35)" fill="none" stroke={ink} strokeWidth={earned ? 1.9 : 1.6} strokeLinecap="round" strokeLinejoin="round">
          {parts.map((p, i) =>
            p.c ? (
              <Circle key={i} cx={p.c[0]} cy={p.c[1]} r={p.c[2]} />
            ) : (
              <Path key={i} d={p.d} transform={p.rot ? `rotate(${p.rot} 12 12)` : undefined} />
            ),
          )}
        </G>
      </Svg>
    </View>
  );
}

/** Altın ışıltı rengi (koyu kart üstünde parlak görünür). */
const GOLD = '#F2C66D';

/** Işıltı: rozetin arkasında yavaşça dönen ışın demeti + yumuşak parıltı. */
function Rays({ size }: { size: number }) {
  const n = 12;
  const c = size / 2;
  const r = size / 2;
  const d = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const w = Math.PI / n / 1.6;
    const p1 = [c + Math.cos(a - w) * r, c + Math.sin(a - w) * r];
    const p2 = [c + Math.cos(a + w) * r, c + Math.sin(a + w) * r];
    return `M${c} ${c} L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)} Z`;
  }).join(' ');
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={GOLD} stopOpacity={0.7} />
          <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="rays" cx="50%" cy="50%" r="50%">
          <Stop offset="0.45" stopColor={GOLD} stopOpacity={0.75} />
          <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Path d={d} fill="url(#rays)" />
      <Circle cx={c} cy={c} r={r} fill="url(#glow)" />
    </Svg>
  );
}

/**
 * Yeni kazanılan rozet: `delay` sonra büyüyerek yerine oturur, arkasında ışıltı belirip yavaşça döner,
 * telefon "başarı" titreşimi verir. "Hareketi azalt" açıksa ışıltı durağan, rozet doğrudan görünür.
 */
export function CelebratedBadge({ id, size = 64, delay = 0 }: { id: string; size?: number; delay?: number }) {
  const still = reduceMotionNow();
  const [pop] = useState(() => new Animated.Value(still ? 1 : 0));
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const t = setTimeout(() => haptic.success(), delay + 120);
    if (still) return () => clearTimeout(t);
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 16 }),
    ]).start();
    // 5 sn içinde yavaşlayıp durur (sürekli hareket dikkat dağıtmasın; WCAG 2.2.2)
    const loop = Animated.timing(spin, { toValue: 1, duration: 5000, delay, easing: Easing.out(Easing.quad), useNativeDriver: true });
    loop.start();
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [pop, spin, delay, still]);
  const raySize = size * 1.5; // kartın iç boşluğuna sığsın
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: raySize,
          height: raySize,
          opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '160deg'] }) }],
        }}
      >
        <Rays size={raySize} />
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <BadgeArt id={id} earned size={size} />
      </Animated.View>
    </View>
  );
}
