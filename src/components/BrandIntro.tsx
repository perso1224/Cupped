import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { BRAND } from '../config/brand';
import { tr } from '../i18n/tr';
import { colors, fonts } from '../theme';
import { reduceMotionNow } from './motion';

const LOGO = 168;
const RINGS = [
  { size: LOGO, width: 9 },
  { size: LOGO * 0.74, width: 7 },
  { size: LOGO * 0.52, width: 5.5 },
];

/**
 * Açılış: logodaki halkalar fincana düşen damlanın dalgası gibi dıştan içe açılır, ortaya nokta düşer,
 * marka adı belirir; toplam ~1,2 sn sonra ekran kendiliğinden kaybolur. "Hareketi azalt"ta kısa ve sade.
 * Yalnızca uygulama soğuk açılışında gösterilir.
 */
export function BrandIntro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [rings] = useState(() => RINGS.map(() => new Animated.Value(0)));
  const [dot] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!ready) return;
    const fadeOut = Animated.timing(out, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true });
    if (reduceMotionNow()) {
      [...rings, dot, word].forEach((v) => v.setValue(1));
      const t = setTimeout(() => fadeOut.start(() => onDone()), 450);
      return () => clearTimeout(t);
    }
    const ease = Easing.out(Easing.cubic);
    const anim = Animated.sequence([
      Animated.stagger(
        80,
        rings.map((v) => Animated.timing(v, { toValue: 1, duration: 320, easing: ease, useNativeDriver: true })),
      ),
      Animated.parallel([
        Animated.timing(dot, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(word, { toValue: 1, duration: 260, easing: ease, useNativeDriver: true }),
      ]),
      Animated.delay(180),
      fadeOut,
    ]);
    anim.start(() => onDone());
    return () => anim.stop();
  }, [ready, rings, dot, word, out, onDone]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: out }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.logo}>
        {RINGS.map((r, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              { width: r.size, height: r.size, borderRadius: r.size / 2, borderWidth: r.width },
              { opacity: rings[i], transform: [{ scale: rings[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.dot,
            { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [-LOGO * 0.6, 0] }) }, { scale: dot }] },
          ]}
        />
      </View>
      <Animated.Text style={[styles.word, { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
        {BRAND.name}
      </Animated.Text>
      <Animated.Text style={[styles.tag, { opacity: word }]}>{tr.intro.tagline}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  logo: { width: LOGO, height: LOGO, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderColor: colors.accent },
  dot: { width: LOGO * 0.2, height: LOGO * 0.2, borderRadius: LOGO * 0.1, backgroundColor: colors.text },
  word: { fontFamily: fonts.heavy, fontSize: 40, color: colors.text, marginTop: 28, letterSpacing: -0.5 },
  tag: { fontSize: 14, fontWeight: '600', color: colors.muted, marginTop: 4, letterSpacing: 0.4 },
});
