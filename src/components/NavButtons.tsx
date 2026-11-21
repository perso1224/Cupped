import { router } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';
import { colors, type } from '../theme';
import { Icon } from './Icon';
import { haptic, PressScale } from './motion';

/** Geri gidilecek ekran yoksa (ör. doğrudan bağlantıyla açıldıysa) ana sayfaya döner. Çıkmaz sokak olmasın. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * iOS tarzı geri düğmesi: turuncu ok + önceki ekranın adı. Büyük başlığın üstünde ayrı satırda durur.
 * Tüm yığın (push) ekranlarında aynı.
 */
export function BackButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <PressScale onPress={onPress ?? goBack} hitSlop={12} scaleTo={0.94} style={styles.back} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name="chevron-back" size={24} color={colors.accentText} />
      <Text style={styles.backText}>{label}</Text>
    </PressScale>
  );
}

/**
 * Tam ekran modallar için kapat düğmesi: 36pt daire içinde ✕ simgesi, sol üstte (iOS kuralı).
 * dark: koyu zemin üzerinde (kamera, Özet).
 */
export function CloseButton({ onPress, dark, tint }: { onPress?: () => void; dark?: boolean; tint?: ColorValue }) {
  return (
    <PressScale
      onPress={() => {
        haptic.select();
        (onPress ?? goBack)();
      }}
      hitSlop={12}
      scaleTo={0.9}
      style={[styles.close, { backgroundColor: dark ? 'rgba(0,0,0,0.45)' : colors.card }]}
      accessibilityRole="button"
      accessibilityLabel="Kapat"
    >
      <Icon name="close" size={20} color={tint ?? (dark ? colors.white : colors.text)} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6, marginBottom: 2 },
  backText: { ...type.body, color: colors.accentText },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
