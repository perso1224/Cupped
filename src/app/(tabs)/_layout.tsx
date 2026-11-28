import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Tabs } from 'expo-router/tabs';
import { Platform, useWindowDimensions } from 'react-native';
import { SideBar } from '../../components/SideBar';
import { InTabsContext, isWide } from '../../lib/contentWidth';
import { TabBar } from '../../components/TabBar';
import { haptic, useReducedMotion } from '../../components/motion';
import { tr } from '../../i18n/tr';
import { colors } from '../../theme';

/** iOS 26.1+: "+" sekmesi Apple'ın ayrı duran yuvarlak sekmesi olarak (menünün sağında, ayrı cam daire). */
const SEPARATE_PLUS = Platform.OS === 'ios' && Number.parseFloat(String(Platform.Version)) >= 26.1;

export default function TabsLayout() {
  // Android tablet: solda yüzen dikey menü; iPhone ve iPad: Apple'ın alt menüsü; Android telefon: kendi alt menümüz
  const { width } = useWindowDimensions();
  if (isWide(width)) return <CustomTabs sidebar />;
  return Platform.OS === 'ios' ? <IosTabs /> : <CustomTabs />;
}

/**
 * iPhone: Apple'ın kendi alt menüsü. iOS 26+'da kendiliğinden tam Liquid Glass olur;
 * daha eski iOS'ta klasik bulanık menü. Ekranlar kendi boşluklarını ayarlar (otomatik iç boşluk kapalı).
 * "+" bir sekme gibi görünür ama seçilmez: dokununca yeni fincan ekranı açılır.
 */
function IosTabs() {
  return (
    <NativeTabs
      tintColor={colors.accentText}
      // "+" kendi (daha belirgin) titreşimini verir
      screenListeners={({ route }) => ({ tabPress: () => route.name !== 'add' && haptic.select() })}
    >
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets contentStyle={{ backgroundColor: colors.bg }}>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>{tr.tabs.home}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress" disableAutomaticContentInsets contentStyle={{ backgroundColor: colors.bg }}>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <NativeTabs.Trigger.Label>{tr.tabs.progress}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="passport" disableAutomaticContentInsets contentStyle={{ backgroundColor: colors.bg }}>
        <NativeTabs.Trigger.Icon sf="rosette" />
        <NativeTabs.Trigger.Label>{tr.tabs.passport}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" disableAutomaticContentInsets contentStyle={{ backgroundColor: colors.bg }}>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <NativeTabs.Trigger.Label>{tr.tabs.profile}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="add"
        disabled
        role={SEPARATE_PLUS ? 'search' : undefined}
        accessibilityLabel={tr.home.ctaButton}
        listeners={{
          tabPress: () => {
            haptic.medium();
            router.push('/new');
          },
        }}
      >
        <NativeTabs.Trigger.Icon sf="plus" />
        <NativeTabs.Trigger.Label hidden={SEPARATE_PLUS}>{tr.tabs.add}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** Android (ve web): kendi çizdiğimiz yüzen menü (components/TabBar.tsx), ayrı "+" düğmesiyle. */
function CustomTabs({ sidebar = false }: { sidebar?: boolean }) {
  // Sekme değişince ekran yana hafifçe kayarak gelir; "hareketi azalt" açıksa anında değişir.
  const reduce = useReducedMotion();
  return (
    // Sayfalar bu bağlamla tablette içeriği soldaki menünün altında bırakmaz (usePagePad)
    <InTabsContext.Provider value>
    <Tabs
      tabBar={(props) => (sidebar ? <SideBar {...props} /> : <TabBar {...props} />)}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        animation: reduce ? 'none' : 'shift',
      }}
      screenListeners={{ tabPress: () => haptic.select() }}
    >
      <Tabs.Screen name="index" options={{ title: tr.tabs.home }} />
      <Tabs.Screen name="progress" options={{ title: tr.tabs.progress }} />
      {/* "+" için yer tutucu: menüde görünmez, düğme doğrudan /new ekranını açar */}
      <Tabs.Screen name="add" options={{ title: '' }} />
      <Tabs.Screen name="passport" options={{ title: tr.tabs.passport }} />
      <Tabs.Screen name="profile" options={{ title: tr.tabs.profile }} />
    </Tabs>
    </InTabsContext.Provider>
  );
}
