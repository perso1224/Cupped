import { View } from 'react-native';
import { tr } from '../i18n/tr';
import { colors } from '../theme';
import { Icon } from './Icon';
import { haptic, PressScale } from './motion';

const STAR = '#E3A43A';

/** Yıldızları gösterir (salt okunur). value 1-5; yoksa hiçbir şey çizmez. */
export function Stars({ value, size = 14 }: { value: number | null | undefined; size?: number }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessible accessibilityLabel={tr.rating.label(value)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={i <= value ? 'star' : 'star-outline'} size={size} color={i <= value ? STAR : colors.tertiary} />
      ))}
    </View>
  );
}

/** Yıldız seçici: dokunulan yıldıza kadar dolar; seçili yıldıza tekrar dokunmak puanı kaldırır. */
export function StarInput({ value, onChange, size = 34 }: { value: number | null; onChange: (v: number | null) => void; size?: number }) {
  return (
    // Ekran okuyucu için tek ayarlanabilir öğe: yukarı/aşağı kaydırarak 0–5 yıldız
    <View
      style={{ flexDirection: 'row', gap: 6 }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={tr.rating.question}
      accessibilityValue={{ min: 0, max: 5, now: value ?? 0, text: value ? tr.rating.current(value) : tr.rating.none }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const cur = value ?? 0;
        const next = e.nativeEvent.actionName === 'increment' ? Math.min(5, cur + 1) : Math.max(0, cur - 1);
        if (next !== cur) {
          haptic.select();
          onChange(next === 0 ? null : next);
        }
      }}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const on = !!value && i <= value;
        return (
          <PressScale
            key={i}
            hitSlop={6}
            scaleTo={0.85}
            accessibilityLabel={tr.rating.label(i)}
            accessibilityState={{ selected: value === i }}
            onPress={() => {
              haptic.select();
              onChange(value === i ? null : i);
            }}
          >
            <Icon name={on ? 'star' : 'star-outline'} size={size} color={on ? STAR : colors.muted} />
          </PressScale>
        );
      })}
    </View>
  );
}
