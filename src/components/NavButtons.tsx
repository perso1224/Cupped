import { router } from 'expo-router';
import { StyleSheet, Text, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors, type } from '../theme';
import { GLASS, GlassSurface } from './Glass';
import { Icon, type IconName } from './Icon';
import { haptic, PressScale } from './motion';

/** Liquid Glass daire boyutu (Apple'ın iOS 26 gezinme düğmeleri gibi 44pt). */
export const GLASS_BTN = 44;

/**
 * Yuvarlak simge düğmesi. iPhone iOS 26+'da Liquid Glass daire; daha eskide ve Android'de `fallback` stili.
 * tint: cam rengi (ör. fotoğraf üstünde koyu cam, beyaz simge okunaklı kalsın).
 */
export function GlassIconButton({
  icon,
  label,
  onPress,
  color = colors.text,
  iconSize = 20,
  tint,
  fallback,
  disabled,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: ColorValue;
  iconSize?: number;
  tint?: string;
  fallback: StyleProp<ViewStyle>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressScale
      onPress={() => {
        haptic.select();
        onPress();
      }}
      disabled={disabled}
      hitSlop={10}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[disabled && { opacity: 0.5 }, style]}
    >
      <GlassSurface style={styles.glassCircle} fallback={fallback} tint={tint} interactive>
        <Icon name={icon} size={iconSize} color={color} />
      </GlassSurface>
    </PressScale>
  );
}

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
  // iOS 26+: Apple'daki gibi yalnızca ok olan cam daire (önceki ekranın adı ekran okuyucuya söylenir)
  if (GLASS)
    return (
      <GlassIconButton
        icon="chevron-back"
        iconSize={22}
        label={label}
        onPress={onPress ?? goBack}
        fallback={null}
        style={styles.backGlass}
      />
    );
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
  if (GLASS)
    return (
      <GlassIconButton
        icon="close"
        label="Kapat"
        onPress={onPress ?? goBack}
        color={tint ?? (dark ? colors.onColor : colors.text)}
        tint={dark ? 'rgba(0,0,0,0.25)' : undefined}
        fallback={null}
      />
    );
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
      <Icon name="close" size={20} color={tint ?? (dark ? colors.onColor : colors.text)} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6, marginBottom: 2 },
  backText: { ...type.body, color: colors.accentText },
  glassCircle: { width: GLASS_BTN, height: GLASS_BTN, borderRadius: GLASS_BTN / 2, alignItems: 'center', justifyContent: 'center' },
  backGlass: { alignSelf: 'flex-start', marginBottom: 8 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
