import { Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_800ExtraBold, useFonts } from '@expo-google-fonts/fraunces';
import { router, usePathname } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Updates from 'expo-updates';
import { Alert, Appearance, AppState, Platform, useWindowDimensions, View } from 'react-native';
import { sidePad } from '../lib/contentWidth';
import { unlockTabletOrientation } from '../lib/tabletOrientation';
import { BrandIntro } from '../components/BrandIntro';
import { setIntroPlaying, useReducedMotion } from '../components/motion';
import { refreshReminder, useNotificationNavigation } from '../lib/reminders';
import { consumeRecoveryNotice, consumeReturnRoute, migratePalateTypes, recordActiveDay } from '../lib/storage';
import { tr } from '../i18n/tr';
import { useProfile } from '../lib/useProfile';
import { colors, isDark, themePref } from '../theme';

// Android tablette yatay ekran açık (telefonlar dikey kalır)
unlockTabletOrientation();

/** Doğrudan bağlantıyla açılan ekranların altında her zaman sekmeler olsun (geri tuşu çıkmaza girmesin). */
export const unstable_settings = { anchor: '(tabs)' };

/** Açılış animasyonu bu oturumda gösterildi mi (modül düzeyi: ekranlar arası gezinmede tekrar çıkmasın). */
let introShown = false;
// Logo oynarken ana sayfa giriş animasyonlarını bekletsin
setIntroPlaying(true);
// Telefonun açılış ekranı (yalnızca zemin rengi) uygulama hazır olana kadar kalsın; hazır olduğu an kalkar ve
// aynı karede giriş animasyonu başlar. Böylece arada boş ekran ya da ikinci bir logo görünmez.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 150 });

/** Tema değişince yeniden yüklemenin güvenli olduğu ekranlar (yarım kalan giriş yok): ana sekmeler. */
const SAFE_TO_RELOAD = new Set(['/', '/progress', '/passport', '/profile']);

/** Aynı ekranın hızlı çift dokunuşla iki kez açılmasını engeller. */
const single = { dangerouslySingular: true } as const;

export default function RootLayout() {
  const profile = useProfile();
  const reduceMotion = useReducedMotion();
  // Başlık yazı tipi. Yüklenemezse (hata) sistem yazı tipiyle devam edilir; uygulama beklemede kalmaz.
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_800ExtraBold });

  // Web (yalnızca test): sayfa dili Türkçe olsun (ekran okuyucu doğru sesle okusun)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = 'tr';
  }, []);

  // H4: uygulamanın açıldığı günleri kaydet; hatırlatmayı güncel tut.
  useEffect(() => {
    const onActive = () => {
      recordActiveDay().catch(() => {});
      refreshReminder();
    };
    onActive();
    // Bir kerelik: eski fincanların damak tipi yeni kararlı hesaba geçer
    migratePalateTypes().catch(() => {});
    // Kayıtlar okunamayacak kadar bozulduysa (çok nadir) kullanıcıya bir kez söyle
    consumeRecoveryNotice().then((v) => v && Alert.alert(tr.recovered.title, tr.recovered.body));
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
    setIntroPlaying(false);
  }, []);

  const ready = profile !== undefined && (fontsLoaded || !!fontError);
  // Bildirime dokununca ilgili ekran (açılış ve profil hazır olunca)
  useNotificationNavigation(ready && !!profile);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  // Tema değişikliği için yeniden yüklendiyse kullanıcıyı kaldığı ekrana (Ayarlar) geri götür
  useEffect(() => {
    if (!ready || !profile) return;
    consumeReturnRoute().then((r) => r && router.push(r));
  }, [ready, profile]);
  const intro = showIntro ? <BrandIntro ready={ready} onDone={endIntro} /> : null;
  const pad = sidePad(useWindowDimensions().width);

  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {intro}
      </View>
    );

  return (
    <>
      <StatusBar style="auto" />
      {/* "Hareketi azalt" açıksa (telefon ya da uygulama ayarı) ekran geçişleri kayma yerine solma */}
      {/* iPad: her ekranın içeriği ortada, en fazla CONTENT_MAX genişlikte (telefonda yan boşluk 0) */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg, paddingHorizontal: pad }, ...(reduceMotion ? { animation: 'fade' as const } : {}) }}>
        {/* Profil varsa uygulama, yoksa tanıtım. Profil silinince/oluşunca yığın temizce değişir. */}
        <Stack.Protected guard={!!profile}>
          <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: colors.bg } }} /* tablette kenar çubuğu kendi yerleşimini yapar */ />
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
          {/* Modallar (fincan sonucu iPad'de zaten dar bir sayfa olarak açılır: yan boşluk yok) */}
          <Stack.Screen name="new" {...single} options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: colors.bg } }} />
          <Stack.Screen name="result/[id]" {...single} options={{ presentation: 'modal', sheetGrabberVisible: true, contentStyle: { backgroundColor: colors.bg } }} />
          <Stack.Screen name="card" {...single} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="wall" {...single} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="evolution" {...single} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen
            name="wrapped"
            {...single}
            options={{ presentation: 'fullScreenModal', animation: 'fade', contentStyle: { backgroundColor: '#000', paddingHorizontal: pad } }}
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
