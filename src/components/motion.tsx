import * as Haptics from 'expo-haptics';
import { cachedSettings, loadSettings, subscribeSettings } from '../lib/storage';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

/**
 * Küçük, fark edilmeyen ama "iyi hissettiren" animasyonlar.
 * Telefonda "Hareketi Azalt" açıksa hepsi kapanır (erişilebilirlik).
 * Hepsi React Native Animated ile ve mümkün olduğunca native driver'da (akıcı, Expo Go uyumlu).
 */

// Hareket azaltma: telefonun sistem ayarı VEYA uygulamadaki ayar. Titreşim de uygulama ayarına uyar.
let systemReduce = false;
let reduceMotion = false;
let hapticsOn = true;
const motionListeners = new Set<(v: boolean) => void>();
const recompute = () => {
  const s = cachedSettings();
  const next = systemReduce || s.reduceMotion;
  hapticsOn = s.haptics;
  if (next !== reduceMotion) {
    reduceMotion = next;
    motionListeners.forEach((fn) => fn(next));
  }
};
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    systemReduce = v;
    recompute();
  })
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
  systemReduce = v;
  recompute();
});
subscribeSettings(recompute);
loadSettings().then(recompute).catch(() => {});

/** Şu anki "hareketi azalt" durumu (animasyon başlatırken okunur). */
export function reduceMotionNow(): boolean {
  return reduceMotion;
}

/** Hareketi azalt değişince bileşeni günceller. */
const subscribeMotion = (cb: () => void) => {
  const fn = () => cb();
  motionListeners.add(fn);
  return () => {
    motionListeners.delete(fn);
  };
};
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, reduceMotionNow, reduceMotionNow);
}

/** Hafif dokunuş titreşimleri. */
export const haptic = {
  select: () => hapticsOn && Haptics.selectionAsync().catch(() => {}),
  light: () => hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => hapticsOn && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => hapticsOn && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};

/** Sonraki düzen değişikliğini (aç/kapa, ekle/çıkar) yumuşak geçişle yap. */
export function animateLayout() {
  if (reduceMotion) return;
  LayoutAnimation.configureNext({
    duration: 220,
    create: { type: 'easeInEaseOut', property: 'opacity' },
    update: { type: 'easeInEaseOut' },
    delete: { type: 'easeInEaseOut', property: 'opacity' },
  });
}

const OUTER_KEYS = new Set([
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'left', 'right', 'bottom', 'zIndex',
]);
/** Yerleşim (dış) ve görünüm (iç) stillerini ayırır: flex/margin dış dokunma alanına, renk/kenar içe. */
function splitStyle(style: StyleProp<ViewStyle>): [ViewStyle, ViewStyle] {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (OUTER_KEYS.has(k) ? outer : inner)[k] = v;
  // İç kutu dış kutuyu doldursun (yan yana kutularda eşit yükseklik için). Yalnızca alignSelf için gerekmez:
  // genişliği zaten yanlara yayılma doldurur; flexGrow ise iPhone'da Geri düğmesini dikey olarak uzatabiliyordu.
  if ('flex' in outer || 'flexGrow' in outer || 'width' in outer) inner.flexGrow = 1;
  return [outer as ViewStyle, inner as ViewStyle];
}

/**
 * Basınca hafifçe içe göçen dokunma alanı (iOS düğmelerindeki gibi).
 * Yerleşim stilleri (flex, margin…) dış alana, görünüm stilleri animasyonlu iç kutuya uygulanır.
 */
export function PressScale({
  children,
  style,
  scaleTo = 0.96,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number; children: ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [outer, inner] = splitStyle(style);
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 6 : 0 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
      style={outer}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduceMotion && !disabled) to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** İlk görünüşte aşağıdan hafifçe süzülerek belirir. index ile sırayla (kademeli) gelir. */
export function FadeIn({
  children,
  index = 0,
  style,
  disabled,
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  /** true: animasyonsuz, doğrudan görünür (ör. yalnızca yeni kayıtta canlandırmak için). */
  disabled?: boolean;
}) {
  const [v] = useState(() => new Animated.Value(reduceMotion || disabled ? 1 : 0));
  useEffect(() => {
    if (reduceMotion || disabled) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 8) * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, index, disabled]);
  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** Sayı değişince eski değerden yenisine sayarak gider (ilk açılışta 0'dan). */
export function CountUp({ value, style, duration = 650 }: { value: number; style?: StyleProp<TextStyle>; duration?: number }) {
  const [anim] = useState(() => new Animated.Value(reduceMotion ? value : 0));
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(value);
      return;
    }
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [anim, value, duration]);
  return <Text style={style}>{reduceMotion ? value : shown}</Text>;
}

/** Bir kez "pop" yapan (büyüyüp yerine oturan) kutu: rozet, seri alevi gibi küçük kutlamalar için. */
export function Pop({
  children,
  style,
  delay = 0,
  trigger,
  skipInitial,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  trigger?: unknown;
  /** true: ilk görünüşte değil, yalnızca `trigger` değişince zıplar. */
  skipInitial?: boolean;
}) {
  const [s] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (reduceMotion || (skipInitial && isFirst)) return;
    s.setValue(0.6);
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(s, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }),
    ]).start();
  }, [s, delay, trigger, skipInitial]);
  return <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>;
}

/** İlerleme çubuğunun dolu kısmı: açılışta 0'dan, sonra değer değişince yumuşakça dolar. fraction 0–1. */
export function GrowBar({ fraction, style }: { fraction: number; style?: StyleProp<ViewStyle> }) {
  const target = Math.max(0, Math.min(1, fraction));
  const [v] = useState(() => new Animated.Value(reduceMotion ? target : 0));
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(target);
      return;
    }
    Animated.timing(v, { toValue: target, duration: 700, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v, target]);
  return <Animated.View style={[style, { width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />;
}

/** Konfeti parçası: başlangıç konumu, sapma, dönüş, renk ve şekil (önceden rastgele seçilir). */
type Piece = { x: number; drift: number; spin: number; delay: number; dur: number; color: string; w: number; h: number; round: boolean };
const CONFETTI_COLORS = ['#D98B2B', '#6B4226', '#C8553D', '#E9C46A', '#8A9A5B', '#F1E3CF'];

/**
 * Kutlama: ekranın üstünden kahve tonlarında konfeti dökülür (yalnızca bir kez, dokunmayı engellemez).
 * `play` true olunca başlar. "Hareketi azalt" açıksa hiç gösterilmez.
 */
export function Confetti({ play, count = 36 }: { play: boolean; count?: number }) {
  const { width, height } = useWindowDimensions();
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      x: Math.random(),
      drift: (Math.random() - 0.5) * 120,
      spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
      delay: Math.random() * 350,
      dur: 1500 + Math.random() * 900,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 5,
      h: 10 + Math.random() * 8,
      round: Math.random() < 0.3,
    })),
  );
  const [vals] = useState(() => pieces.map(() => new Animated.Value(0)));
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!play || reduceMotion) return;
    const anims = vals.map((v, i) =>
      Animated.timing(v, { toValue: 1, duration: pieces[i].dur, delay: pieces[i].delay, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    );
    Animated.parallel(anims).start(() => setDone(true));
  }, [play, vals, pieces]);
  if (!play || reduceMotion || done) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => {
        const v = vals[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x * width,
              top: -24,
              width: p.w,
              height: p.round ? p.w : p.h,
              borderRadius: p.round ? p.w / 2 : 2,
              backgroundColor: p.color,
              opacity: v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 48] }) },
                { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.drift, p.drift * 0.4] }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Listeden bir kayıt silinince (ör. fincan detayında Sil → geri dönüş) satır hemen kaybolmaz:
 * ekran göründükten kısa süre sonra solarak çıkar, alttakiler yukarı kayar.
 * Diğer değişiklikler (ekleme, ilk yükleme) anında uygulanır.
 */
export function useAnimatedRemovals<T extends { id: string }>(list: T[] | null): T[] | null {
  const [shown, setShown] = useState(list);
  const prev = useRef(list);
  useEffect(() => {
    const before = prev.current;
    prev.current = list;
    const ids = new Set((list ?? []).map((e) => e.id));
    const removed = !!before && !!list && before.some((e) => !ids.has(e.id));
    if (!removed || reduceMotion) {
      setShown(list);
      return;
    }
    // Geri dönüş geçişi bitsin, sonra satır gözle görülerek kaybolsun
    const t = setTimeout(() => {
      LayoutAnimation.configureNext({
        duration: 320,
        update: { type: 'easeInEaseOut' },
        delete: { type: 'easeInEaseOut', property: 'opacity' },
      });
      setShown(list);
    }, 380);
    return () => clearTimeout(t);
  }, [list]);
  return shown;
}

/**
 * Açılış logosu (BrandIntro) oynarken arkadaki ekranların giriş animasyonları görünmez.
 * Ana sayfa bu bayrağı bekler; kartlar logo kaybolunca sırayla süzülür.
 */
let introPlaying = false;
const introListeners = new Set<() => void>();
export function setIntroPlaying(v: boolean) {
  if (introPlaying === v) return;
  introPlaying = v;
  introListeners.forEach((fn) => fn());
}
const subscribeIntro = (cb: () => void) => {
  introListeners.add(cb);
  return () => {
    introListeners.delete(cb);
  };
};
const introDoneNow = () => !introPlaying;
export function useIntroDone(): boolean {
  return useSyncExternalStore(subscribeIntro, introDoneNow, introDoneNow);
}
