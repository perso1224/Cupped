import { router, useScrollToTop } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../i18n/tr';
import { useProfile } from '../lib/useProfile';
import { colors, isDark, tint } from '../theme';
import { GLASS, GlassSurface } from './Glass';
import { Icon, type IconName } from './Icon';
import { haptic, PressScale, reduceMotionNow } from './motion';

const BAR_HEIGHT = 64;
const GAP_BELOW = 8;
const ROW_PAD = 6;

/** Sekme ekranlarının içeriği yüzen menünün altında kalmasın diye en alta bırakılacak boşluk. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'ios') {
    // iPhone'da Apple'ın kendi menüsü var. Alt güvenli alan menüyü zaten içeriyorsa (≥ 49) üstüne biraz boşluk;
    // içermiyorsa menünün yüksekliğini de ekle. İçerik camın arkasından akar, son satır menünün üstünde biter.
    return insets.bottom >= IOS_TAB_BAR ? insets.bottom + 24 : insets.bottom + IOS_TAB_BAR + 24;
  }
  return barBottom(insets.bottom) + BAR_HEIGHT + 24;
}

const IOS_TAB_BAR = 49;

/** Sekme ekranının kaydırma alanı için: etkin sekmeye tekrar dokununca en üste kayar (iOS/Android alışkanlığı). */
export function useTabScrollRef() {
  const ref = useRef<ScrollViewInstance>(null);
  useScrollToTop(ref);
  return ref;
}

const barBottom = (safeBottom: number) => Math.max(safeBottom - 10, GAP_BELOW + 4);

const TABS: Record<string, { icon: string; label: string }> = {
  index: { icon: 'home', label: tr.tabs.home },
  progress: { icon: 'stats-chart', label: tr.tabs.progress },
  passport: { icon: 'ribbon', label: tr.tabs.passport },
  profile: { icon: 'person', label: tr.tabs.profile },
};

/**
 * Yüzen alt menü: yuvarlak beyaz kapsül içinde sekmeler, seçili sekmenin arkasında krem vurgu.
 * "+" menünün dışında, sağda ayrı espresso rengi daire. Profil sekmesinde kullanıcının baş harfi.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Kayan vurgu: seçili sekmenin arkasındaki kapsül, sekmeler arasında kayarak gider (iOS gibi).
  const visible = state.routes.filter((r) => TABS[r.name]);
  const active = visible.findIndex((r) => r.key === state.routes[state.index]?.key);
  const [rowW, setRowW] = useState(0);
  const itemW = visible.length ? (rowW - ROW_PAD * 2) / visible.length : 0;
  const [x] = useState(() => new Animated.Value(0));
  const [shown] = useState(() => new Animated.Value(0));
  const placed = useRef(false);
  useEffect(() => {
    if (!itemW) return;
    const to = ROW_PAD + Math.max(active, 0) * itemW;
    // İlk yerleşimde ve "hareketi azalt"ta zıplamadan yerine koy
    if (!placed.current || reduceMotionNow()) x.setValue(to);
    else Animated.spring(x, { toValue: to, useNativeDriver: true, speed: 18, bounciness: 7 }).start();
    placed.current = true;
    Animated.timing(shown, { toValue: active >= 0 ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [active, itemW, x, shown]);
  return (
    <View style={[styles.wrap, { bottom: barBottom(insets.bottom) }]} pointerEvents="box-none">
      {/* iOS 26+: gerçek Liquid Glass; daha eskide beyaz kapsül + gölge */}
      <GlassSurface style={styles.pill} fallback={styles.pillSolid} interactive>
        <View style={styles.pillRow} accessibilityRole="tablist" onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
        {itemW ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.highlight, { width: itemW, opacity: shown, transform: [{ translateX: x }] }]}
          />
        ) : null}
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null; // "add" yer tutucusu: menüde gösterilmez
          const focused = index === state.index;
          const label = (descriptors[route.key]?.options.title as string | undefined) ?? meta.label;
          return (
            <TabItem
              key={route.key}
              name={route.name}
              icon={meta.icon}
              label={label}
              focused={focused}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
            />
          );
        })}
        </View>
      </GlassSurface>
      <PressScale
        accessibilityLabel={tr.home.ctaButton}
        onPress={() => {
          haptic.medium();
          router.push('/new');
        }}
        scaleTo={0.9}
        style={styles.plusWrap}
      >
        <GlassSurface style={styles.plus} fallback={styles.plusSolid} tint={tint.espresso} interactive>
          <Icon name="add" size={32} color={colors.onColor} />
        </GlassSurface>
      </PressScale>
    </View>
  );
}

function TabItem({ name, icon, label, focused, onPress }: { name: string; icon: string; label: string; focused: boolean; onPress: () => void }) {
  // Dar ekranda (ör. iPhone SE, küçük Android) etiketler birbirine değmesin
  const compact = useWindowDimensions().width < 360;
  // Seçilince simge hafifçe zıplar (ilk açılışta değil, yalnızca sekme değişince)
  const [bump] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!focused || reduceMotionNow()) return;
    bump.setValue(0.78);
    Animated.spring(bump, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }).start();
  }, [focused, bump]);
  // Camda Apple gibi: seçili sekme renkli (kahve tonu), arkasında hafif gri mercek. Düz menüde siyah + krem vurgu.
  const color = focused ? (GLASS ? colors.accentText : colors.text) : GLASS ? colors.text : colors.muted;

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.92}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={{ transform: [{ scale: bump }] }}>
        {name === 'profile' ? <Avatar focused={focused} /> : <Icon name={(focused ? icon : `${icon}-outline`) as IconName} size={22} color={color} />}
      </Animated.View>
      <Text style={[styles.label, { color }, compact && { fontSize: 9 }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </PressScale>
  );
}

/** Profil sekmesi: simge yerine takma adın baş harfi. */
function Avatar({ focused }: { focused: boolean }) {
  const profile = useProfile();
  const initial = (profile?.nickname?.trim()?.[0] ?? 'C').toLocaleUpperCase('tr-TR');
  return (
    <View style={[styles.avatar, focused ? styles.avatarOn : null]}>
      <Text style={[styles.avatarText, focused && { color: colors.onColor }]}>{initial}</Text>
    </View>
  );
}

const shadow = {
  shadowColor: '#2B1A12',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { flex: 1, height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2 },
  // Koyu temada kartlarla aynı renk olmasın: biraz daha açık zemin + ince çerçeve
  pillSolid: { backgroundColor: isDark ? '#2E241E' : colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.line, ...shadow },
  pillRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: ROW_PAD },
  item: { flex: 1, height: BAR_HEIGHT - 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  highlight: { position: 'absolute', top: 6, left: 0, height: BAR_HEIGHT - 12, borderRadius: (BAR_HEIGHT - 12) / 2, backgroundColor: GLASS ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)') : colors.accentSoft },
  label: { fontSize: 10, fontWeight: '600' },
  plusWrap: { width: BAR_HEIGHT, height: BAR_HEIGHT },
  plus: { width: BAR_HEIGHT, height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, alignItems: 'center', justifyContent: 'center' },
  plusSolid: { backgroundColor: tint.espresso, ...shadow },
  avatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  avatarOn: { backgroundColor: tint.espresso },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.text },
});
