import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="cup/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="card" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </>
  );
}
