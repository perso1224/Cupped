import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '../config/brand';
import { tr } from '../i18n/tr';
import { SIDEBAR_W } from '../lib/contentWidth';
import { useProfile } from '../lib/useProfile';
import { colors, fonts, isDark } from '../theme';
import { Icon, type IconName } from './Icon';
import { LogoMark } from './LogoMark';
import { haptic, PressScale } from './motion';

const ITEMS: Record<string, { icon: string; label: string }> = {
  index: { icon: 'home', label: tr.tabs.home },
  progress: { icon: 'stats-chart', label: tr.tabs.progress },
  passport: { icon: 'ribbon', label: tr.tabs.passport },
  profile: { icon: 'person', label: tr.tabs.profile },
};

/**
 * Tablet menüsü (iPad, Android tablet): solda kenar çubuğu. Üstte logo + Cupped, altında sekmeler
 * (seçili olan krem zeminli), ardından belirgin "Kahve ekle" düğmesi. Telefonda kullanılmaz.
 */
export function SideBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]} accessibilityRole="tablist">
      <View style={styles.brand} accessible accessibilityLabel={BRAND.name}>
        <LogoMark size={30} color={colors.text} />
        <Text style={styles.brandText}>{BRAND.name}</Text>
      </View>

      <View style={{ gap: 4 }}>
        {state.routes.map((route, index) => {
          const meta = ITEMS[route.name];
          if (!meta) return null; // "add" yer tutucusu
          const focused = index === state.index;
          const label = (descriptors[route.key]?.options.title as string | undefined) ?? meta.label;
          return (
            <PressScale
              key={route.key}
              scaleTo={0.97}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              style={[styles.item, focused && styles.itemOn]}
              onPress={() => {
                haptic.select();
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
            >
              {route.name === 'profile' ? (
                <Avatar focused={focused} />
              ) : (
                <Icon name={(focused ? meta.icon : `${meta.icon}-outline`) as IconName} size={22} color={focused ? colors.accentText : colors.text} />
              )}
              <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>
                {label}
              </Text>
            </PressScale>
          );
        })}
      </View>

      <PressScale
        accessibilityLabel={tr.home.ctaButton}
        scaleTo={0.96}
        style={styles.add}
        onPress={() => {
          haptic.medium();
          router.push('/new');
        }}
      >
        <Icon name="add" size={24} color={colors.onColor} />
        <Text style={styles.addText}>{tr.home.ctaButton}</Text>
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

const styles = StyleSheet.create({
  bar: {
    width: SIDEBAR_W,
    paddingHorizontal: 16,
    backgroundColor: isDark ? '#1B1511' : colors.card,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.line,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 28 },
  brandText: { fontFamily: fonts.heavy, fontSize: 24, color: colors.text, paddingRight: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48, paddingHorizontal: 12, borderRadius: 14 },
  itemOn: { backgroundColor: colors.accentSoft },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  labelOn: { color: colors.accentText, fontWeight: '700' },
  add: {
    marginTop: 20,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
  },
  addText: { fontSize: 16, fontWeight: '700', color: colors.onColor },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  avatarOn: { backgroundColor: colors.accent },
  avatarText: { fontSize: 12, fontWeight: '800', color: colors.text },
});
