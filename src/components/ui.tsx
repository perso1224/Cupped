import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { haptic, PressScale } from './motion';
import { colors, radius } from '../theme';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressScale
      onPress={() => {
        haptic.select();
        onPress();
      }}
      scaleTo={0.93}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
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
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** dark: ana eylem · light: ikincil · accent: turuncu (yazı siyah, okunur) */
  variant?: 'dark' | 'light' | 'accent';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'dark' ? colors.black : variant === 'accent' ? colors.accent : colors.card;
  const border = variant === 'light' ? colors.line : bg;
  const fg = variant === 'dark' ? colors.white : colors.text;
  return (
    <PressScale
      onPress={() => {
        haptic.light();
        onPress();
      }}
      disabled={disabled}
      style={[styles.pill, { backgroundColor: bg, borderColor: border }, disabled && { opacity: 0.35 }, style]}
    >
      <View style={styles.pillInner}>
        {icon ? <Icon name={icon} size={18} color={fg} /> : null}
        <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
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
  return (
    <View style={styles.segment}>
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
            style={[styles.segmentItem, on && styles.segmentOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.segmentText, on && { color: colors.text }]}>{o.label}</Text>
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
  segmentItem: { flex: 1, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.muted },
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
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 24,
  },
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
