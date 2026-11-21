import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { tr } from '../i18n/tr';
import type { StripDay } from '../lib/progress';
import { colors, type } from '../theme';
import { reduceMotionNow } from './motion';

const H = 120;

/** Haftalık çubuk grafik: her gün en yüksek skor, kesikli çizgi = haftalık ortalama. */
export function WeekChart({ days }: { days: StripDay[] }) {
  const scores = days.map((d) => d.best).filter((x): x is number => x !== null);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const [grow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotionNow()) {
      grow.setValue(1);
      return;
    }
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [grow, scores.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View>
      <View style={{ height: H }}>
        {avg !== null ? (
          <Svg width="100%" height={H} style={StyleSheet.absoluteFill}>
            <Line x1="0" x2="100%" y1={H - (avg / 100) * H} y2={H - (avg / 100) * H} stroke={colors.accent} strokeDasharray="4 5" strokeWidth={1.5} />
          </Svg>
        ) : null}
        <View style={styles.bars}>
          {days.map((d) => (
            <View key={d.key} style={styles.col}>
              {d.best !== null ? (
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: grow.interpolate({ inputRange: [0, 1], outputRange: [4, Math.max(6, (d.best / 100) * H)] }),
                      backgroundColor: d.isToday ? colors.accent : colors.black,
                      opacity: d.isToday ? 1 : 0.85,
                    },
                  ]}
                />
              ) : (
                <View style={[styles.bar, styles.empty, d.isFuture && { opacity: 0.4 }]} />
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
  bar: { width: '100%', maxWidth: 26, borderRadius: 6 },
  empty: { height: 6, backgroundColor: colors.line },
  labels: { flexDirection: 'row', gap: 10, marginTop: 8 },
  label: { ...type.caption, flex: 1, textAlign: 'center' },
});
