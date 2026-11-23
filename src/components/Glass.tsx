import type { ComponentType, ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import type { GlassViewProps } from 'expo-glass-effect';

/**
 * iOS 26+ Liquid Glass, güvenli şekilde.
 * Modül bu uygulamada yoksa (ör. eski Expo Go) ya da iPhone iOS 26 öncesiyse hiçbir şey çökmez:
 * `GLASS` null olur ve çağıran düz (beyaz) görünüme düşer.
 */
let GlassViewImpl: ComponentType<GlassViewProps> | null = null;
if (Platform.OS === 'ios') {
  try {
    // Modül yüklenirken yerel parçası yoksa hata fırlatır; bu yüzden içe aktarma try içinde yapılır.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('expo-glass-effect') as typeof import('expo-glass-effect');
    if (m.isGlassEffectAPIAvailable() && m.isLiquidGlassAvailable()) GlassViewImpl = m.GlassView;
  } catch {
    GlassViewImpl = null;
  }
}

export const GLASS = GlassViewImpl !== null;

/** Cam yüzey: Liquid Glass varsa cam, yoksa `fallback` stiliyle düz görünüm. */
export function GlassSurface({
  style,
  fallback,
  tint,
  interactive,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  fallback?: StyleProp<ViewStyle>;
  tint?: string;
  interactive?: boolean;
  children?: ReactNode;
}) {
  if (GlassViewImpl) {
    return (
      <GlassViewImpl style={style} glassEffectStyle="regular" tintColor={tint} isInteractive={interactive}>
        {children}
      </GlassViewImpl>
    );
  }
  return <View style={[style, fallback]}>{children}</View>;
}
