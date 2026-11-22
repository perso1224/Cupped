import { Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_800ExtraBold, useFonts } from '@expo-google-fonts/fraunces';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Appearance, AppState, View } from 'react-native';
import { refreshReminder } from '../lib/reminders';
import { recordActiveDay } from '../lib/storage';
import { useProfile } from '../lib/useProfile';
import { colors, isDark } from '../theme';

/** Doğrudan bağlantıyla açılan ekranların altında her zaman sekmeler olsun (geri tuşu çıkmaza girmesin). */
export const unstable_settings = { anchor: '(tabs)' };

/** Aynı ekranın hızlı çift dokunuşla iki kez açılmasını engeller. */
const single = { dangerouslySingular: true } as const;

export default function RootLayout() {
  const profile = useProfile();
  // Başlık yazı tipi. Yüklenemezse (hata) sistem yazı tipiyle devam edilir; uygulama beklemede kalmaz.
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_800ExtraBold });

  // H4: uygulamanın açıldığı günleri kaydet; hatırlatmayı güncel tut.
  useEffect(() => {
    const onActive = () => {
      recordActiveDay().catch(() => {});
      refreshReminder();
    };
    onActive();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && onActive());
    return () => sub.remove();
  }, []);

  // Karanlık mod: renkler açılışta seçilir. Telefonun görünümü değişirse, uygulama ÖNDEYKEN yeniden yükle.
  // (iOS arka plana geçerken iki temada ekran görüntüsü alır ve görünümü kısa süre değiştirir; o an yüklemeyiz.)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (AppState.currentState !== 'active') return;
        if ((Appearance.getColorScheme() === 'dark') !== isDark) Updates.reloadAsync().catch(() => {});
      }, 400);
    };
    const a = Appearance.addChangeListener(check);
    const b = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => {
      clearTimeout(timer);
      a.remove();
      b.remove();
    };
  }, []);

  if (profile === undefined || (!fontsLoaded && !fontError)) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {/* Profil varsa uygulama, yoksa tanıtım. Profil silinince/oluşunca yığın temizce değişir. */}
        <Stack.Protected guard={!!profile}>
          <Stack.Screen name="(tabs)" />
          {/* Yığın ekranları: sağdan kayar, Geri ile döner */}
          <Stack.Screen name="cup/[id]" dangerouslySingular={(_, params) => String((params as { id?: string })?.id ?? '')} />
          <Stack.Screen name="history" {...single} />
          <Stack.Screen name="collection/badges" {...single} />
          <Stack.Screen name="collection/places" {...single} />
          <Stack.Screen name="collection/methods" {...single} />
          <Stack.Screen name="settings" {...single} />
          <Stack.Screen name="privacy" {...single} />
          <Stack.Screen name="stats" {...single} />
          {/* Modallar */}
          <Stack.Screen name="new" {...single} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="result/[id]" {...single} options={{ presentation: 'modal', sheetGrabberVisible: true }} />
          <Stack.Screen name="card" {...single} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen
            name="wrapped"
            {...single}
            options={{ presentation: 'fullScreenModal', animation: 'fade', contentStyle: { backgroundColor: '#000' } }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!profile}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
