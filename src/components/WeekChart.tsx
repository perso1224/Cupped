import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { tr } from '../i18n/tr';
import type { StripDay } from '../lib/progress';
import { colors, type } from '../theme';
import { reduceMotionNow } from './motion';

const H = 120;

/**
 * Haftalık çubuk grafik: her günün ortalama skoru, kesikli çizgi = haftalık ortalama (ikisi aynı ölçü).
 * avg verilirse (haftanın tüm fincanlarının ortalaması) çizgi, kartın üstündeki "Ortalama" ile aynı değeri gösterir.
 */
export function WeekChart({ days, avg: avgProp }: { days: StripDay[]; avg?: number | null }) {
  const scores = days.map((d) => d.avg).filter((x): x is number => x !== null);
  const avg = avgProp !== undefined ? avgProp : scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const scoresKey = scores.join(',');
  const [grow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotionNow()) {
      grow.setValue(1);
      return;
    }
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [grow, scoresKey]); // yalnızca değerler değişince yeniden büyüsün (her çizimde değil)

  // Ekran okuyucu: grafik tek cümleyle özetlenir
  const cupDays = days.filter((d) => d.avg !== null).length;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={tr.a11y.weekChart(cupDays, avg === null ? null : Math.round(avg))}>
      <View style={{ height: H }}>
        <Svg width="100%" height={H} style={StyleSheet.absoluteFill}>
          {/* Taban çizgisi */}
          <Line x1="0" x2="100%" y1={H - 0.5} y2={H - 0.5} stroke={colors.line} strokeWidth={1} />
          {avg !== null ? (
            <Line x1="0" x2="100%" y1={H - (avg / 100) * H} y2={H - (avg / 100) * H} stroke={colors.accent} strokeDasharray="3 4" strokeWidth={1.25} />
          ) : null}
        </Svg>
        <View style={styles.bars}>
          {days.map((d) => (
            <View key={d.key} style={styles.col}>
              {d.avg !== null ? (
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: grow.interpolate({ inputRange: [0, 1], outputRange: [4, Math.max(6, (d.avg / 100) * H)] }),
                      backgroundColor: d.isToday ? colors.accent : colors.text,
                      opacity: d.isToday ? 1 : 0.82,
                    },
                  ]}
                />
              ) : (
                // Kahvesiz gün: taban çizgisinde küçük bir çentik
                <View style={[styles.empty, d.isFuture && { opacity: 0.5 }]} />
              )}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.labels}>
        {days.map((d, i) => (
          <Text key={d.key} style={[styles.label, d.isToday && { color: colors.text, fontWeight: '700' }]}>
            {tr.weekdaysShort[i]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: H, gap: 10 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: H },
  bar: { width: '100%', maxWidth: 18, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  empty: { width: 6, height: 3, borderRadius: 1.5, backgroundColor: colors.tertiary, opacity: 0.6 },
  labels: { flexDirection: 'row', gap: 10, marginTop: 8 },
  label: { ...type.caption, flex: 1, textAlign: 'center' },
});
