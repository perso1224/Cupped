import { useEffect, useState } from 'react';
import { Animated, Easing, Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';
import { Icon } from './Icon';
import { haptic, reduceMotionNow } from './motion';

// Metro görselleri require ile pakete ekler
const ART: Record<string, ImageSourcePropType> = {
  routine: require('../../assets/badges/routine.png'),
  third_wave_refugee: require('../../assets/badges/third_wave_refugee.png'),
  chain_loyal: require('../../assets/badges/chain_loyal.png'),
  pourover_patience: require('../../assets/badges/pourover_patience.png'),
  first_geisha: require('../../assets/badges/first_geisha.png'),
  five_new_month: require('../../assets/badges/five_new_month.png'),
  depth: require('../../assets/badges/depth.png'),
  first_turkish: require('../../assets/badges/first_turkish.png'),
  first_coldbrew: require('../../assets/badges/first_coldbrew.png'),
  ten_places: require('../../assets/badges/ten_places.png'),
  streak30: require('../../assets/badges/streak30.png'),
  hundred_cups: require('../../assets/badges/hundred_cups.png'),
};

/**
 * Rozet görseli. Kazanılmadıysa soluk görünür (ne olduğu merak edilsin), köşesinde küçük kilit.
 * Görseli olmayan rozette eski kurdele simgesi.
 */
export function BadgeArt({ id, earned, size = 56 }: { id: string; earned: boolean; size?: number }) {
  const src = ART[id];
  if (!src) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: earned ? colors.accent : colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={earned ? 'ribbon' : 'lock-closed'} size={size * 0.45} color={earned ? colors.onColor : colors.muted} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={src} style={{ width: size, height: size, opacity: earned ? 1 : 0.3 }} resizeMode="contain" />
      {earned ? null : (
        <View style={{ position: 'absolute', right: -2, bottom: -2, width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock-closed" size={size * 0.2} color={colors.muted} />
        </View>
      )}
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
