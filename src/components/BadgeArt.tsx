import { Image, View, type ImageSourcePropType } from 'react-native';
import { colors } from '../theme';
import { Icon } from './Icon';

// Metro görselleri require ile pakete ekler
const ART: Record<string, ImageSourcePropType> = {
  routine: require('../../assets/badges/routine.png'),
  third_wave_refugee: require('../../assets/badges/third_wave_refugee.png'),
  chain_loyal: require('../../assets/badges/chain_loyal.png'),
  pourover_patience: require('../../assets/badges/pourover_patience.png'),
  first_geisha: require('../../assets/badges/first_geisha.png'),
  five_new_month: require('../../assets/badges/five_new_month.png'),
  depth: require('../../assets/badges/depth.png'),
  first_turkish: require('../../assets/badges/first_turkish.png'),
  first_coldbrew: require('../../assets/badges/first_coldbrew.png'),
  ten_places: require('../../assets/badges/ten_places.png'),
  streak30: require('../../assets/badges/streak30.png'),
  hundred_cups: require('../../assets/badges/hundred_cups.png'),
};

/**
 * Rozet görseli. Kazanılmadıysa soluk görünür (ne olduğu merak edilsin), köşesinde küçük kilit.
 * Görseli olmayan rozette eski kurdele simgesi.
 */
export function BadgeArt({ id, earned, size = 56 }: { id: string; earned: boolean; size?: number }) {
  const src = ART[id];
  if (!src) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: earned ? colors.accent : colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={earned ? 'ribbon' : 'lock-closed'} size={size * 0.45} color={earned ? colors.onColor : colors.muted} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={src} style={{ width: size, height: size, opacity: earned ? 1 : 0.3 }} resizeMode="contain" />
      {earned ? null : (
        <View style={{ position: 'absolute', right: -2, bottom: -2, width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock-closed" size={size * 0.2} color={colors.muted} />
        </View>
      )}
    </View>
  );
}
