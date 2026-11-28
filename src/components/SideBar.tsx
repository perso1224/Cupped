import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { tr } from '../i18n/tr';
import { useProfile } from '../lib/useProfile';
import { colors, isDark, tint } from '../theme';
import { GLASS, GlassSurface } from './Glass';
import { Icon, type IconName } from './Icon';
import { haptic, PressScale, reduceMotionNow } from './motion';

const BAR_W = 78;
const ITEM_H = 64;
const PAD = 6;

// iPhone'daki menüyle aynı simgeler: iPad'de Apple'ın kendi SF Symbols'ü (derlemede varsa), yoksa benzer Ionicons
const ITEMS: Record<string, { icon: string; sf: [string, string]; label: string }> = {
  index: { icon: 'home', sf: ['house', 'house.fill'], label: tr.tabs.home },
  progress: { icon: 'stats-chart', sf: ['chart.bar', 'chart.bar.fill'], label: tr.tabs.progress },
  passport: { icon: 'ribbon', sf: ['rosette', 'rosette'], label: tr.tabs.passport },
  profile: { icon: 'person-circle', sf: ['person.crop.circle', 'person.crop.circle.fill'], label: tr.tabs.profile },
};

// SF Symbols yalnızca iOS'ta ve modülü içeren derlemede (eski derlemede Ionicons'a düşer)
const SymbolView: typeof import('expo-symbols').SymbolView | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- yalnızca modül varsa yüklenmeli
  Platform.OS === 'ios' && requireOptionalNativeModule('SymbolModule') ? require('expo-symbols').SymbolView : null;

function TabIcon({ ion, sf, size, color }: { ion: string; sf: string; size: number; color: string }) {
  if (SymbolView) return <SymbolView name={sf as never} size={size} tintColor={color} weight="medium" />;
  return <Icon name={ion as IconName} size={size} color={color} />;
}

/**
 * Tablet menüsü (iPad, Android tablet): iPhone'daki yüzen alt menünün dikey hâli. Solda, ekranın ortasında
 * yüzen cam kapsül (Liquid Glass olan sürümlerde gerçek cam, diğerlerinde düz kapsül + gölge); seçili sekmenin
 * arkasında kayan vurgu; altında ayrı yuvarlak "+" düğmesi. İçerik menünün arkasından akmaz, yanında kalır.
 */
export function SideBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const visible = state.routes.filter((r) => ITEMS[r.name]);
  const active = visible.findIndex((r) => r.key === state.routes[state.index]?.key);
  const [y] = useState(() => new Animated.Value(PAD + Math.max(active, 0) * ITEM_H));
  const placed = useRef(false);
  useEffect(() => {
    const to = PAD + Math.max(active, 0) * ITEM_H;
    if (!placed.current || reduceMotionNow()) y.setValue(to);
    else Animated.spring(y, { toValue: to, useNativeDriver: true, speed: 18, bounciness: 7 }).start();
    placed.current = true;
  }, [active, y]);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <GlassSurface style={styles.pill} fallback={styles.pillSolid} interactive>
        <View style={styles.col} accessibilityRole="tablist">
          {active >= 0 ? <Animated.View pointerEvents="none" style={[styles.highlight, { transform: [{ translateY: y }] }]} /> : null}
          {state.routes.map((route, index) => {
            const meta = ITEMS[route.name];
            if (!meta) return null; // "add" yer tutucusu
            const focused = index === state.index;
            const label = (descriptors[route.key]?.options.title as string | undefined) ?? meta.label;
            const color = focused ? (GLASS ? colors.accentText : colors.text) : GLASS ? colors.text : colors.muted;
            return (
              <PressScale
                key={route.key}
                scaleTo={0.92}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: focused }}
                style={styles.item}
                onPress={() => {
                  haptic.select();
                  const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigateToTab(route.key);
                }}
              >
                {route.name === 'profile' && !SymbolView ? (
                  <Avatar focused={focused} />
                ) : (
                  <TabIcon ion={focused ? meta.icon : `${meta.icon}-outline`} sf={meta.sf[focused ? 1 : 0]} size={25} color={color} />
                )}
                <Text style={[styles.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {label}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </GlassSurface>
      <PressScale
        accessibilityLabel={tr.home.ctaButton}
        scaleTo={0.9}
        style={styles.plusWrap}
        onPress={() => {
          haptic.medium();
          router.push('/new');
        }}
      >
        {/* iPhone'daki gibi: şeffaf cam daire, içinde koyu + */}
        <GlassSurface style={styles.plus} fallback={styles.plusSolid} interactive>
          <TabIcon ion="add" sf="plus" size={28} color={GLASS ? colors.text : colors.onColor} />
        </GlassSurface>
      </PressScale>
    </View>
  );
}

function Avatar({ focused }: { focused: boolean }) {
  const profile = useProfile();
  const initial = (profile?.nickname?.trim()?.[0] ?? 'C').toLocaleUpperCase('tr-TR');
  return (
    <View style={[styles.avatar, focused && styles.avatarOn]}>
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
  // Solda, dikeyde ortada
  wrap: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 12 },
  pill: { width: BAR_W, borderRadius: BAR_W / 2 },
  pillSolid: {
    backgroundColor: isDark ? '#2E241E' : colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.line,
    ...shadow,
  },
  col: { paddingVertical: PAD, alignItems: 'center' },
  item: { width: BAR_W - 12, height: ITEM_H, alignItems: 'center', justifyContent: 'center', gap: 3 },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 6,
    width: BAR_W - 12,
    height: ITEM_H,
    borderRadius: (BAR_W - 12) / 2,
    backgroundColor: GLASS ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)') : colors.accentSoft,
  },
  label: { fontSize: 11, fontWeight: '600' },
  plusWrap: { width: 66, height: 66 },
  plus: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  plusSolid: { backgroundColor: tint.espresso, ...shadow },
  avatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  avatarOn: { backgroundColor: tint.espresso },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.text },
});
