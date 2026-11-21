import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type ColorValue } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { PressScale, haptic, reduceMotionNow } from '../../components/motion';
import { tr } from '../../i18n/tr';
import { colors } from '../../theme';

/** Sekme simgesi (iOS gibi: seçiliyken dolu, değilken çizgi). Seçilince hafifçe büyüyüp yerine oturur. */
function TabIcon({ name, color, focused }: { name: string; color: ColorValue; focused: boolean }) {
  const [s] = useState(() => new Animated.Value(focused ? 1.08 : 1));
  useEffect(() => {
    if (reduceMotionNow()) s.setValue(focused ? 1.08 : 1);
    else Animated.spring(s, { toValue: focused ? 1.08 : 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
  }, [focused, s]);
  return (
    <Animated.View style={{ transform: [{ scale: s }] }}>
      <Icon name={(focused ? name : `${name}-outline`) as IconName} size={24} color={color} />
    </Animated.View>
  );
}

export default function TabsLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
      screenListeners={{ tabPress: () => haptic.select() }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: tr.tabs.home, tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="home" color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: tr.tabs.progress, tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="stats-chart" color={color} /> }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={styles.plusSlot}>
              <PressScale
                accessibilityLabel={tr.home.ctaButton}
                accessibilityRole="button"
                onPress={() => {
                  haptic.medium();
                  router.push('/new');
                }}
                scaleTo={0.92}
                style={styles.plus}
              >
                <Icon name="add" size={34} color={colors.white} />
              </PressScale>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{ title: tr.tabs.passport, tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="ribbon" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: tr.tabs.profile, tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} name="person-circle" color={color} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  plusSlot: { flex: 1, alignItems: 'center' },
  plus: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
