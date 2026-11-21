import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Dairesel skor halkası. `animate` açıksa 0'dan skora dolarak açılır. */
export function ScoreRing({
  score,
  size = 180,
  stroke = 14,
  animate = false,
  caption,
  empty,
  onAnimationEnd,
}: {
  score: number;
  size?: number;
  stroke?: number;
  animate?: boolean;
  caption?: string;
  /** Skor yokken halkada "–" göster (0 kötü bir not gibi görünmesin). */
  empty?: boolean;
  onAnimationEnd?: () => void;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // Animated.Value bir kez oluşturulur (useState başlatıcısı; ref'i render'da okumamak için)
  const [progress] = useState(() => new Animated.Value(animate ? 0 : score));
  const [animShown, setAnimShown] = useState(0);
  const shown = animate ? animShown : score;
  const onEnd = useRef(onAnimationEnd);
  useEffect(() => {
    onEnd.current = onAnimationEnd;
  });

  useEffect(() => {
    if (!animate) {
      progress.setValue(score);
      return;
    }
    const id = progress.addListener(({ value }) => setAnimShown(Math.round(value)));
    Animated.timing(progress, {
      toValue: score,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => onEnd.current?.());
    return () => progress.removeListener(id);
  }, [score, animate, progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.number, { fontSize: size * 0.32 }]}>{empty ? '–' : shown}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  number: { fontWeight: '900', color: colors.text, letterSpacing: -1 },
  caption: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: -2 },
});
