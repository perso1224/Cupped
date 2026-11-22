import { Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_800ExtraBold, useFonts } from '@expo-google-fonts/fraunces';
import { usePathname } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Updates from 'expo-updates';
import { Appearance, AppState, View } from 'react-native';
import { BrandIntro } from '../components/BrandIntro';
import { refreshReminder } from '../lib/reminders';
import { recordActiveDay } from '../lib/storage';
import { useProfile } from '../lib/useProfile';
import { colors, isDark, themePref } from '../theme';

/** Doğrudan bağlantıyla açılan ekranların altında her zaman sekmeler olsun (geri tuşu çıkmaza girmesin). */
export const unstable_settings = { anchor: '(tabs)' };

/** Açılış animasyonu bu oturumda gösterildi mi (modül düzeyi: ekranlar arası gezinmede tekrar çıkmasın). */
let introShown = false;

/** Tema değişince yeniden yüklemenin güvenli olduğu ekranlar (yarım kalan giriş yok): ana sekmeler. */
const SAFE_TO_RELOAD = new Set(['/', '/progress', '/passport', '/profile']);

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

  // Karanlık mod: renkler açılışta seçilir. Telefonun görünümü değişirse uygulama yeniden yüklenir; ama
  // yalnızca öndeyken VE bir ana sekmedeyken. Fincan eklerken/düzenlerken yeniden yükleme yazılanları siler,
  // o yüzden kullanıcı bir sekmeye dönene kadar beklenir.
  // (iOS arka plana geçerken iki temada ekran görüntüsü alır ve görünümü kısa süre değiştirir; o an yüklemeyiz.)
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const checkRef = useRef<() => void>(() => {});
  useEffect(() => {
    pathRef.current = pathname;
    checkRef.current(); // sekmeye dönüldüyse bekleyen tema değişikliğini şimdi uygula
  }, [pathname]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (AppState.currentState !== 'active' || themePref !== 'system') return;
        if (!SAFE_TO_RELOAD.has(pathRef.current)) return;
        if ((Appearance.getColorScheme() === 'dark') !== isDark) Updates.reloadAsync().catch(() => {});
      }, 400);
    };
    checkRef.current = check;
    const a = Appearance.addChangeListener(check);
    const b = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => {
      clearTimeout(timer);
      a.remove();
      b.remove();
    };
  }, []);

  // Açılış animasyonu: yalnızca uygulama açılışında bir kez (yeniden yüklemede yine gösterilir)
  const [showIntro, setShowIntro] = useState(!introShown);
  const endIntro = useCallback(() => {
    introShown = true;
    setShowIntro(false);
  }, []);
  const ready = profile !== undefined && (fontsLoaded || !!fontError);
  const intro = showIntro ? <BrandIntro ready={ready} onDone={endIntro} /> : null;

  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {intro}
      </View>
    );

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
          <Stack.Screen name="match" {...single} />
          {/* Modallar */}
          <Stack.Screen name="new" {...single} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="result/[id]" {...single} options={{ presentation: 'modal', sheetGrabberVisible: true }} />
          <Stack.Screen name="card" {...single} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="wall" {...single} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
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
      {/* Açılış animasyonu en üstte, uygulamanın üzerinden kaybolur */}
      {intro}
    </>
  );
}
