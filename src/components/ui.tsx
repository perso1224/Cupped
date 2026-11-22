import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { GLASS, GlassSurface } from './Glass';
import { Icon, type IconName } from './Icon';
import { haptic, PressScale, reduceMotionNow } from './motion';
import { colors, radius } from '../theme';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressScale
      onPress={() => {
        haptic.select();
        onPress();
      }}
      scaleTo={0.93}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1} maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
    </PressScale>
  );
}

export function PillButton({
  label,
  onPress,
  disabled,
  variant = 'dark',
  icon,
  style,
  glass,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** dark: ana eylem · light: ikincil · accent: turuncu (yazı siyah, okunur) */
  variant?: 'dark' | 'light' | 'accent';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  /** iPhone iOS 26+'da Liquid Glass kapsül (paylaş gibi düğmeler); diğerlerinde `variant` görünümü. */
  glass?: boolean;
}) {
  if (glass && GLASS) {
    return (
      <PressScale
        onPress={() => {
          haptic.light();
          onPress();
        }}
        disabled={disabled}
        style={[styles.pill, styles.pillClear, disabled && { opacity: 0.35 }, style]}
      >
        <GlassSurface style={styles.glassFill} interactive />
        <View style={styles.pillInner}>
          {icon ? <Icon name={icon} size={18} color={colors.text} /> : null}
          <Text style={[styles.pillText, { color: colors.text }]} maxFontSizeMultiplier={1.4}>{label}</Text>
        </View>
      </PressScale>
    );
  }
  // Pasif düğme soluklaştırılmaz (okunmuyordu): gri zemin, okunur gri yazı.
  // Turuncu zeminde yazı her temada koyu (açık renk yazı turuncu üstünde okunmaz).
  const bg = disabled ? colors.line : variant === 'dark' ? colors.black : variant === 'accent' ? colors.accent : colors.card;
  const border = disabled ? colors.line : variant === 'light' ? colors.line : bg;
  const fg = disabled ? colors.muted : variant === 'dark' ? colors.white : variant === 'accent' ? '#111111' : colors.text;
  return (
    <PressScale
      onPress={() => {
        haptic.light();
        onPress();
      }}
      disabled={disabled}
      hitSlop={6}
      style={[styles.pill, { backgroundColor: bg, borderColor: border }, style]}
    >
      <View style={styles.pillInner}>
        {icon ? <Icon name={icon} size={18} color={fg} /> : null}
        <Text style={[styles.pillText, { color: fg }]} maxFontSizeMultiplier={1.4}>{label}</Text>
      </View>
    </PressScale>
  );
}

/** iOS tarzı bölümlü seçici (Hafta / Ay gibi). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  // Seçili kutu, seçenekler arasında kayarak gider (iOS bölümlü seçicisi gibi).
  const [w, setW] = useState(0);
  const itemW = options.length ? (w - 4) / options.length : 0;
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const [x] = useState(() => new Animated.Value(0));
  const placed = useRef(false);
  useEffect(() => {
    if (!itemW) return;
    if (!placed.current || reduceMotionNow()) x.setValue(idx * itemW);
    else Animated.spring(x, { toValue: idx * itemW, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    placed.current = true;
  }, [idx, itemW, x]);
  return (
    <View style={styles.segment} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {itemW ? <Animated.View pointerEvents="none" style={[styles.segmentOn, { width: itemW, transform: [{ translateX: x }] }]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressScale
            key={o.value}
            onPress={() => {
              if (!on) {
                haptic.select();
                onChange(o.value);
              }
            }}
            scaleTo={0.97}
            style={styles.segmentItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text style={[styles.segmentText, on && { opacity: 1, fontWeight: '700' }]} maxFontSizeMultiplier={1.3}>{o.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: 10, padding: 2 },
  segmentItem: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { position: 'absolute', top: 2, left: 2, height: 36, borderRadius: 8, backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  // Seçili olmayan yazı da okunur kontrastta (gri zemin üstünde gri yazı yetmiyordu)
  segmentText: { fontSize: 14, fontWeight: '500', color: colors.text, opacity: 0.75 },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.text },
  chipTextSelected: { color: colors.white },
  pill: {
    // Yükseklik sabit (bazı ekranlar 46/36 verir); büyük yazıda taşmasın diye yazı ölçeği sınırlı (maxFontSizeMultiplier)
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 24,
  },
  pillClear: { backgroundColor: 'transparent', borderColor: 'transparent' },
  glassFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.pill },
  pillInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillText: { fontSize: 17, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2, // Android gölgesi (iOS yok sayar)
  },
});
