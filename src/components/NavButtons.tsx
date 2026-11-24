import { router } from 'expo-router';
import { StyleSheet, Text, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../i18n/tr';
import { colors, layout, type } from '../theme';
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
        // Yazısız cam düğme: ekran okuyucu "Geri, Profil" desin
        label={tr.a11y.back(label)}
        onPress={onPress ?? goBack}
        fallback={null}
        style={styles.backGlass}
      />
    );
  return (
    <PressScale onPress={onPress ?? goBack} hitSlop={12} scaleTo={0.94} style={styles.back} accessibilityRole="button" accessibilityLabel={tr.a11y.back(label)}>
      <Icon name="chevron-back" size={24} color={colors.accentText} />
      <Text style={styles.backText}>{label}</Text>
    </PressScale>
  );
}

/** Kapat düğmesinin boyu (cam: 44, düz: 36). Sabit düğmenin altında boş yer bırakmak için. */
export const CLOSE_SIZE = GLASS ? GLASS_BTN : 36;
/** Sabit geri düğmesinin kaydırılan içerikte kapladığı yer (düğme + alt boşluk). */
const BACK_SPACE = (GLASS ? GLASS_BTN : 36) + 8;

/** Kaydırılan içeriğin başında, sabit geri düğmesinin altına başlık girmesin diye boşluk. */
export function BackSpacer() {
  return <View style={{ height: BACK_SPACE }} />;
}

/**
 * Sayfa kaydırılsa da ekranın üstünde sabit kalan geri düğmesi: kullanıcı çıkmak için yukarı dönmek zorunda kalmaz.
 * Kaydırılan alanın kardeşi olarak, en sonda çizilir; içeriğin başına <BackSpacer /> konur.
 * iOS 26+: cam daire (içerik camın altından akar). Diğerlerinde (Android, eski iOS): kart renginde, gölgeli hap.
 */
export function FloatingBack({ label, onPress, left = layout.screenPad }: { label: string; onPress?: () => void; left?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.floating, { top: insets.top + layout.topPad, left }]}>
      {GLASS ? (
        <BackButton label={label} onPress={onPress} />
      ) : (
        <PressScale
          onPress={() => {
            haptic.select();
            (onPress ?? goBack)();
          }}
          hitSlop={10}
          scaleTo={0.94}
          style={styles.backPill}
          accessibilityRole="button"
          accessibilityLabel={tr.a11y.back(label)}
        >
          <Icon name="chevron-back" size={22} color={colors.accentText} />
          <Text style={styles.backText} numberOfLines={1}>{label}</Text>
        </PressScale>
      )}
    </View>
  );
}

/** Kapat düğmesini sayfa kaydırılsa da sol üstte sabit tutar (bkz. FloatingBack). */
export function FloatingClose({ onPress, top, left = layout.screenPad }: { onPress?: () => void; top: number; left?: number }) {
  return (
    <View pointerEvents="box-none" style={[styles.floating, { top, left }]}>
      <CloseButton onPress={onPress} />
    </View>
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
  floating: { position: 'absolute', zIndex: 10, elevation: 10 },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 18,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  close: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
