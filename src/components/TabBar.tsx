import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../i18n/tr';
import { useProfile } from '../lib/useProfile';
import { colors, isDark, tint } from '../theme';
import { GLASS, GlassSurface } from './Glass';
import { Icon, type IconName } from './Icon';
import { haptic, PressScale, reduceMotionNow } from './motion';

const BAR_HEIGHT = 64;
const GAP_BELOW = 8;

/** Sekme ekranlarının içeriği yüzen menünün altında kalmasın diye en alta bırakılacak boşluk. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return barBottom(insets.bottom) + BAR_HEIGHT + 24;
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
  return (
    <View style={[styles.wrap, { bottom: barBottom(insets.bottom) }]} pointerEvents="box-none">
      {/* iOS 26+: gerçek Liquid Glass; daha eskide beyaz kapsül + gölge */}
      <GlassSurface style={styles.pill} fallback={styles.pillSolid} interactive>
        <View style={styles.pillRow} accessibilityRole="tablist">
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
  const [on] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    if (reduceMotionNow()) on.setValue(focused ? 1 : 0);
    else Animated.spring(on, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 22, bounciness: 6 }).start();
  }, [focused, on]);
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
      {/* Seçili sekmenin arkasındaki krem vurgu: büyüyüp belirir */}
      <Animated.View style={[styles.highlight, { opacity: on, transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]} />
      {name === 'profile' ? <Avatar focused={focused} /> : <Icon name={(focused ? icon : `${icon}-outline`) as IconName} size={22} color={color} />}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
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
  pillSolid: { backgroundColor: colors.card, ...shadow },
  pillRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  item: { flex: 1, height: BAR_HEIGHT - 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: (BAR_HEIGHT - 12) / 2, backgroundColor: GLASS ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)') : colors.accentSoft },
  label: { fontSize: 10, fontWeight: '600' },
  plusWrap: { width: BAR_HEIGHT, height: BAR_HEIGHT },
  plus: { width: BAR_HEIGHT, height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, alignItems: 'center', justifyContent: 'center' },
  plusSolid: { backgroundColor: tint.espresso, ...shadow },
  avatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  avatarOn: { backgroundColor: tint.espresso },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.text },
});
