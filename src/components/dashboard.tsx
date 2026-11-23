import { useRef, useState, type ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, type ColorValue, type ScrollViewInstance } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Icon, type IconName } from './Icon';
import { GrowBar, haptic } from './motion';
import { tr } from '../i18n/tr';

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
        <GrowBar style={[styles.tileFill, { backgroundColor: color }]} fraction={f > 0 ? Math.max(0.06, f) : 0} value={f} label={`${label} ${value}`} />
      </View>
    </View>
  );
}

/**
 * Yatay kaydırılan sayfalar + altta nokta göstergesi.
 * bleed: sayfalar kenar boşluğuna taşar ki kartların gölgesi kaydırma alanında kesilmesin
 * (kesilince yuvarlak köşelerde gri kare izler kalıyordu).
 */
export function Pager({ pages, width: inner, bleed = 20 }: { pages: ReactNode[]; width: number; bleed?: number }) {
  const width = inner + bleed * 2;
  const [x] = useState(() => new Animated.Value(0));
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const goTo = (p: number) => {
    const next = Math.max(0, Math.min(pages.length - 1, p));
    scroller.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };
  return (
    <View>
      <ScrollView
        ref={scroller}
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
        style={{ width, marginHorizontal: -bleed }}
      >
        {pages.map((p, i) => (
          <View key={i} style={{ width, paddingHorizontal: bleed, paddingTop: 6, paddingBottom: 24 }}>
            {p}
          </View>
        ))}
      </ScrollView>
      {pages.length > 1 ? (
      // Ekran okuyucu: "Sayfa 2 / 5"; yukarı/aşağı kaydırarak sayfa değişir
      <View
        style={styles.dots}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={tr.a11y.pager(page + 1, pages.length)}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => goTo(page + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
      >
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
    elevation: 2, // Android gölgesi (iOS yok sayar)
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  tileValue: { fontSize: 22, fontFamily: fonts.display, color: colors.text, flexShrink: 1 },
  tileTrack: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden', marginTop: 12 },
  tileFill: { height: 8, borderRadius: 4 },
  tileLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: -8, gap: 6 },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.text },
});
