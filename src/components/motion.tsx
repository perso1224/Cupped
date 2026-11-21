import * as Haptics from 'expo-haptics';
import { cachedSettings, loadSettings, subscribeSettings } from '../lib/storage';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
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
  if ('flex' in outer || 'width' in outer || 'alignSelf' in outer) inner.flexGrow = 1; // iç kutu dışı doldursun
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
      {...rest}
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
export function FadeIn({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 8) * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, index]);
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
export function Pop({ children, style, delay = 0, trigger }: { children: ReactNode; style?: StyleProp<ViewStyle>; delay?: number; trigger?: unknown }) {
  const [s] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduceMotion) return;
    s.setValue(0.6);
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(s, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }),
    ]).start();
  }, [s, delay, trigger]);
  return <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>;
}
