import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { BRAND } from '../config/brand';
import { tr } from '../i18n/tr';
import { fonts } from '../theme';
import { reduceMotionNow } from './motion';

const LOGO = 168;
/**
 * Açılış, temadan bağımsız olarak uygulama ikonunun renklerinde: telefonun açılış ekranı (app.json, expo-splash-screen)
 * da aynı turuncu. Böylece açık/koyu mod ya da uygulama içi tema ne olursa olsun açılış ekranı → animasyon geçişi
 * kesintisiz; animasyon bitince uygulama kendi temasıyla belirir.
 */
export const INTRO_BG = '#D98B2B';
const INTRO_INK = '#111111';
// Uygulama ikonundaki halkalar (şeffaf görsel): her telefonda aynı çizilsin diye görsel kullanılıyor
const RINGS = require('../../assets/intro-rings.png');

/**
 * Açılış: logodaki halkalar fincana düşen damlanın dalgası gibi büyüyerek belirir, ortaya nokta düşer,
 * marka adı belirir; toplam ~1,2 sn sonra ekran kendiliğinden kaybolur. "Hareketi azalt"ta kısa ve sade.
 * Yalnızca uygulama açılışında gösterilir.
 */
export function BrandIntro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [rings] = useState(() => new Animated.Value(0));
  const [dot] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!ready) return;
    const fadeOut = Animated.timing(out, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true });
    if (reduceMotionNow()) {
      [rings, dot, word].forEach((v) => v.setValue(1));
      const t = setTimeout(() => fadeOut.start(() => onDone()), 450);
      return () => clearTimeout(t);
    }
    const ease = Easing.out(Easing.cubic);
    const anim = Animated.sequence([
      Animated.timing(rings, { toValue: 1, duration: 420, easing: ease, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(dot, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(word, { toValue: 1, duration: 260, easing: ease, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      fadeOut,
    ]);
    anim.start(() => onDone());
    return () => anim.stop();
  }, [ready, rings, dot, word, out, onDone]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: out }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.logo}>
        <Animated.Image
          source={RINGS}
          tintColor={INTRO_INK}
          style={[styles.rings, { opacity: rings, transform: [{ scale: rings.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}
          resizeMode="contain"
        />
        <Animated.View
          style={[
            styles.dot,
            { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [-LOGO * 0.5, 0] }) }, { scale: dot }] },
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
  screen: { backgroundColor: INTRO_BG, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },
  logo: { width: LOGO, height: LOGO, alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute', top: 0, left: 0, width: LOGO, height: LOGO },
  dot: { width: LOGO * 0.25, height: LOGO * 0.25, borderRadius: LOGO * 0.125, backgroundColor: INTRO_INK },
  word: { fontFamily: fonts.heavy, fontSize: 40, color: INTRO_INK, marginTop: 28, paddingHorizontal: 6 },
  tag: { fontSize: 14, fontWeight: '600', color: 'rgba(17,17,17,0.72)', marginTop: 4, letterSpacing: 0.4 },
});
