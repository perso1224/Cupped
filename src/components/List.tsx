import { Children, Fragment, type ReactNode } from 'react';
import { Platform, StyleSheet, Switch, Text, View, type ColorValue } from 'react-native';
import { upper } from '../i18n/tr';
import { colors, type } from '../theme';
import { Icon, type IconName } from './Icon';
import { haptic, PressScale } from './motion';

/** iOS Ayarlar tarzı gruplu bölüm: başlık + beyaz yuvarlak grup + alt not. */
export function ListSection({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.header}>{upper(title)}</Text> : null}
      <View style={styles.group}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 ? <View style={styles.separator} /> : null}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

/** Liste satırı: renkli simge kutusu, başlık, (alt başlık), sağda değer / ok / anahtar. */
export function ListRow({
  icon,
  tint = colors.accent,
  title,
  subtitle,
  value,
  onPress,
  chevron,
  toggle,
  onToggle,
  destructive,
  right,
}: {
  icon?: IconName;
  tint?: ColorValue;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  destructive?: boolean;
  right?: ReactNode;
}) {
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: tint }]}>
          <Icon name={icon} size={17} color="#fff" />
        </View>
      ) : null}
      {/* Kısa değerler (saat, sayı) hep tam görünür; uzun değer başlıktan önce kısalır. Dar ekranda başlık da kısalabilir. */}
      <View style={subtitle ? { flex: 1 } : { flexGrow: 1, flexShrink: 1, minWidth: '45%' }}>
        <Text style={[styles.title, destructive && { color: colors.danger }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text style={[styles.value, { flexShrink: value.length <= 8 ? 0 : 1 }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right ? <View style={{ flexShrink: 1, minWidth: 80 }}>{right}</View> : null}
      {toggle !== undefined ? (
        <Switch
          accessibilityLabel={title}
          value={toggle}
          onValueChange={(v) => {
            onToggle?.(v);
            haptic.select();
          }}
          trackColor={{ true: colors.accent, false: colors.line }}
          // iOS: topuzu sisteme bırak (iOS 26'da basılı tutunca Liquid Glass olur); Android'de beyaz.
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={colors.line}
        />
      ) : null}
      {chevron ? <Icon name="chevron-forward" size={18} color={colors.tertiary} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressScale onPress={onPress} scaleTo={0.985} android_ripple={{ color: colors.line }}>
      {content}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  header: { ...type.sectionHeader, marginLeft: 16, marginBottom: 6 },
  footer: { ...type.footnote, marginHorizontal: 16, marginTop: 6, lineHeight: 18 },
  group: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.body },
  subtitle: { ...type.footnote, marginTop: 1 },
  value: { ...type.body, color: colors.muted, flexShrink: 1, textAlign: 'right' },
});
