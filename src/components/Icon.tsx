import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { colors } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * iOS tarzı çizgi simge (Ionicons). Süs öğesidir: ekran okuyucu okumaz (anlamı düğmenin etiketinde).
 */
export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: ColorValue }) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color as string}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    />
  );
}
