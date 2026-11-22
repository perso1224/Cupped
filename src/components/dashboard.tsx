import { useState, type ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, type ColorValue } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Icon, type IconName } from './Icon';
import { haptic } from './motion';

/** Küçük halka: Cal AI'daki makro halkalarının karşılığı (Emek / Keşif / Derinlik, kafein…). */
export function MiniRing({
  fraction,
  center,
  size = 58,
  stroke = 6,
  color = colors.accent,
  track = colors.line,
}: {
  fraction: number;
  center: ReactNode;
  size?: number;
  stroke?: number;
  color?: ColorValue;
  track?: ColorValue;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {f > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - f)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {center}
    </View>
  );
}

/** Ölçü kartı: değer, etiket ve altta dolum çubuğu. */
export function MetricTile({
  value,
  label,
  fraction,
  color,
  icon,
}: {
  value: string;
  label: string;
  fraction: number;
  color: ColorValue;
  icon: IconName;
}) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <View style={styles.tile}>
      <View style={styles.tileTop}>
        <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
      {/* Dolum çubuğu: bardağın dolması gibi soldan sağa */}
      <View style={styles.tileTrack}>
        <View style={[styles.tileFill, { width: `${Math.max(f > 0 ? 6 : 0, f * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Yatay kaydırılan sayfalar + altta nokta göstergesi. */
export function Pager({ pages, width }: { pages: ReactNode[]; width: number }) {
  const [x] = useState(() => new Animated.Value(0));
  const [page, setPage] = useState(0);
  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / width);
          if (p !== page) {
            setPage(p);
            haptic.select();
          }
        }}
        style={{ width }}
      >
        {pages.map((p, i) => (
          <View key={i} style={{ width }}>
            {p}
          </View>
        ))}
      </ScrollView>
      {pages.length > 1 ? (
      <View style={styles.dots}>
        {pages.map((_, i) => {
          const w = x.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [6, 18, 6],
            extrapolate: 'clamp',
          });
          const o = x.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return <Animated.View key={i} style={[styles.dot, { width: w, opacity: o }]} />;
        })}
      </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  tileValue: { fontSize: 22, fontFamily: fonts.display, color: colors.text, flexShrink: 1 },
  tileTrack: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden', marginTop: 12 },
  tileFill: { height: 8, borderRadius: 4 },
  tileLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.text },
});
