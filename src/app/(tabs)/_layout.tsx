import { Tabs } from 'expo-router/tabs';
import { TabBar } from '../../components/TabBar';
import { haptic } from '../../components/motion';
import { tr } from '../../i18n/tr';
import { colors } from '../../theme';

/** Alt menü components/TabBar.tsx'te çizilir (yüzen kapsül + ayrı "+" düğmesi). */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      screenListeners={{ tabPress: () => haptic.select() }}
    >
      <Tabs.Screen name="index" options={{ title: tr.tabs.home }} />
      <Tabs.Screen name="progress" options={{ title: tr.tabs.progress }} />
      {/* "+" için yer tutucu: menüde görünmez, düğme doğrudan /new ekranını açar */}
      <Tabs.Screen name="add" options={{ title: '' }} />
      <Tabs.Screen name="passport" options={{ title: tr.tabs.passport }} />
      <Tabs.Screen name="profile" options={{ title: tr.tabs.profile }} />
    </Tabs>
  );
}
