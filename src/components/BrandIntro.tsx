import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { BRAND } from '../config/brand';
import { tr } from '../i18n/tr';
import { fonts } from '../theme';
import { reduceMotionNow } from './motion';

const LOGO = 96;
const GAP = 14;
/**
 * Açılış, temadan bağımsız olarak uygulama ikonunun renklerinde: telefonun açılış ekranı (app.json, expo-splash-screen)
 * da aynı turuncu. Böylece açık/koyu mod ya da uygulama içi tema ne olursa olsun açılış ekranı → animasyon geçişi
 * kesintisiz; animasyon bitince uygulama kendi temasıyla belirir.
 */
export const INTRO_BG = '#D98B2B';
const INTRO_INK = '#111111';
const INTRO_WORD = '#FFF6EA';
// Uygulama ikonundaki halkalar (şeffaf görsel): her telefonda aynı çizilsin diye görsel kullanılıyor
const RINGS = require('../../assets/intro-rings.png');

/**
 * Açılış (~1,8 sn): logodaki halkalar damlanın dalgası gibi açılır, ortaya nokta düşer.
 * Sonra logo sola kayar, krem renkli "Cupped" yanından süzülür; altında ince harf aralıklı slogan.
 * "Hareketi azalt"ta kısa ve sade. Yalnızca uygulama açılışında gösterilir.
 */
export function BrandIntro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [rings] = useState(() => new Animated.Value(0));
  const [dot] = useState(() => new Animated.Value(0));
  const [slide] = useState(() => new Animated.Value(0));
  const [tag] = useState(() => new Animated.Value(0));
  const [out] = useState(() => new Animated.Value(1));
  // "Cupped" yazısının genişliği ölçülünce logo ne kadar sola kayacak belli olur (ölçülene kadar tahmin)
  const [wordW, setWordW] = useState(168);
  const shift = (wordW + GAP) / 2;

  useEffect(() => {
    if (!ready) return;
    const fadeOut = Animated.timing(out, { toValue: 0, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true });
    if (reduceMotionNow()) {
      [rings, dot, slide, tag].forEach((v) => v.setValue(1));
      const t = setTimeout(() => fadeOut.start(() => onDone()), 500);
      return () => clearTimeout(t);
    }
    const ease = Easing.out(Easing.cubic);
    const anim = Animated.sequence([
      Animated.timing(rings, { toValue: 1, duration: 420, easing: ease, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 1, duration: 340, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(tag, { toValue: 1, duration: 200, easing: ease, useNativeDriver: true }),
      Animated.delay(220),
      fadeOut,
    ]);
    anim.start(() => onDone());
    return () => anim.stop();
  }, [ready, rings, dot, slide, tag, out, onDone]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: out }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.lockup}>
        {/* Logo: önce ekranın ortasında, sonra sola kayar */}
        <Animated.View style={{ transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [shift, 0] }) }] }}>
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
                { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [-LOGO * 0.45, 0] }) }, { scale: dot }] },
              ]}
            />
          </View>
        </Animated.View>
        {/* Ad: logonun yanından süzülür */}
        <Animated.Text
          onLayout={(e) => setWordW(e.nativeEvent.layout.width)}
          style={[
            styles.word,
            {
              opacity: slide,
              transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [shift + 18, 0] }) }],
            },
          ]}
        >
          {BRAND.name}
        </Animated.Text>
      </View>
      <Animated.Text style={[styles.tag, { opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>
        {tr.intro.tagline.toLocaleUpperCase('tr-TR')}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: INTRO_BG, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingLeft: 10 }, // yazının sağ payını dengeler (ortada dursun)
  logo: { width: LOGO, height: LOGO, alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute', top: 0, left: 0, width: LOGO, height: LOGO },
  dot: { width: LOGO * 0.25, height: LOGO * 0.25, borderRadius: LOGO * 0.125, backgroundColor: INTRO_INK },
  // Ad krem: logo (koyu) ile aynı renkte düz durmasın
  word: {
    fontFamily: fonts.heavy,
    fontSize: 52,
    color: INTRO_WORD,
    // Sağda pay: iPhone Fraunces'in son harfini (d) ve gölgesini kesmesin
    paddingLeft: 4,
    paddingRight: 14,
    // Hafif gölge: krem yazı turuncu zeminden ayrılsın
    textShadowColor: 'rgba(60,30,5,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tag: { fontSize: 12, fontWeight: '700', color: 'rgba(17,17,17,0.7)', marginTop: 18, letterSpacing: 3 },
});
