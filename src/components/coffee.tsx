import { useEffect, useState } from 'react';
import { Animated, Easing, View, type ColorValue } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors, tint } from '../theme';
import { reduceMotionNow } from './motion';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** Cupped'ın kendi göstergesi: skor arttıkça fincan kahveyle dolar (halka yerine). */
export function CupGauge({ fraction, size = 96, animate = false }: { fraction: number; size?: number; animate?: boolean }) {
  const f = Math.max(0, Math.min(1, fraction));
  // Fincanın içi y=34 (ağız) ile y=82 (dip) arası
  const TOP = 34;
  const BOTTOM = 82;
  const [level] = useState(() => new Animated.Value(animate && !reduceMotionNow() ? 0 : f));
  useEffect(() => {
    if (!animate || reduceMotionNow()) {
      level.setValue(f);
      return;
    }
    Animated.timing(level, { toValue: f, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [f, animate, level]);
  const fillY = level.interpolate({ inputRange: [0, 1], outputRange: [BOTTOM, TOP] });
  const fillH = level.interpolate({ inputRange: [0, 1], outputRange: [0, BOTTOM - TOP] });
  const cremaY = level.interpolate({ inputRange: [0, 1], outputRange: [BOTTOM, TOP] });

  const body = 'M22 32 H78 L73 74 Q72 82 64 82 H36 Q28 82 27 74 Z';
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="cupBody">
            <Path d={body} />
          </ClipPath>
        </Defs>
        {/* Buhar: fincanda kahve varsa */}
        {f > 0 ? (
          <G stroke={colors.tertiary} strokeWidth={2.5} strokeLinecap="round" fill="none">
            <Path d="M40 24 C36 18 44 14 40 6" />
            <Path d="M50 24 C46 18 54 14 50 6" />
            <Path d="M60 24 C56 18 64 14 60 6" />
          </G>
        ) : null}
        <Ellipse cx={50} cy={88} rx={38} ry={5} fill={colors.line} />
        <Path d={body} fill={colors.card} />
        <G clipPath="url(#cupBody)">
          <AnimatedRect x={20} y={fillY} width={60} height={fillH} fill={tint.espresso} />
          <AnimatedRect x={20} y={cremaY} width={60} height={4} fill={colors.accent} />
        </G>
        <Path d="M77 42 Q92 42 90 56 Q88 68 74 66" stroke={colors.text} strokeWidth={4} fill="none" strokeLinecap="round" />
        <Path d={body} stroke={colors.text} strokeWidth={4} fill="none" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** Kahve çekirdeği simgesi (seri göstergesi; alev yerine). */
export function Bean({ size = 18, color = tint.espresso, line = colors.white }: { size?: number; color?: ColorValue; line?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G transform="rotate(35 12 12)">
        <Ellipse cx={12} cy={12} rx={7} ry={10} fill={color} />
        <Path d="M12 2.5 C8.5 7 15.5 11 12 15.5 C10.5 17.5 11 20 12 21.5" stroke={line} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </G>
    </Svg>
  );
}
