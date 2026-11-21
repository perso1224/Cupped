import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { refreshReminder } from '../lib/reminders';
import { recordActiveDay } from '../lib/storage';
import { colors } from '../theme';

export default function RootLayout() {
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

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="new" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="cup/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="collection" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="card" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="wrapped" options={{ presentation: 'fullScreenModal', animation: 'fade', contentStyle: { backgroundColor: '#000' } }} />
      </Stack>
    </>
  );
}
