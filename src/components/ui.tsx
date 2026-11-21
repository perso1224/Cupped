import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function PillButton({
  label,
  onPress,
  disabled,
  variant = 'dark',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'dark' | 'light';
  style?: ViewStyle;
}) {
  const dark = variant === 'dark';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: dark ? colors.black : colors.card, borderColor: dark ? colors.black : colors.line },
        disabled && { opacity: 0.35 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={[styles.pillText, { color: dark ? colors.white : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
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
  pillText: { fontSize: 17, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
