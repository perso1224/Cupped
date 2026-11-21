import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { tr } from '../../i18n/tr';
import { colors } from '../../theme';

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 88 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: tr.tabs.home, tabBarIcon: ({ color }) => <TabIcon glyph="⌂" color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: tr.tabs.progress, tabBarIcon: ({ color }) => <TabIcon glyph="▤" color={color} /> }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={styles.plusSlot}>
              <Pressable
                accessibilityLabel="Fincan ekle"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  router.push('/new');
                }}
                style={({ pressed }) => [styles.plus, pressed && { transform: [{ scale: 0.94 }] }]}
              >
                <Text style={styles.plusText}>+</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{ title: tr.tabs.passport, tabBarIcon: ({ color }) => <TabIcon glyph="✦" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: tr.tabs.profile, tabBarIcon: ({ color }) => <TabIcon glyph="◉" color={color} /> }}
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
  plusText: { color: colors.white, fontSize: 36, fontWeight: '300', marginTop: -3 },
});
