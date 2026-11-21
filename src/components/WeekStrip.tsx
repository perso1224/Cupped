import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { tr } from '../i18n/tr';
import type { StripDay } from '../lib/progress';
import { colors } from '../theme';

const SIZE = 36;
const STROKE = 4;

/** Haftalık gün şeridi: her gün için küçük halka (o günün en yüksek skoruna göre dolu). */
export function WeekStrip({ days }: { days: StripDay[] }) {
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.row}>
      {days.map((d, i) => (
        <View key={d.key} style={styles.day}>
          <Text style={[styles.label, d.isToday && styles.labelToday]}>{tr.weekdaysShort[i]}</Text>
          <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                stroke={d.isFuture ? colors.line : colors.line}
                strokeDasharray={d.isFuture ? '3 4' : undefined}
                strokeWidth={STROKE}
                fill={d.isToday ? colors.black : 'none'}
              />
              {d.best !== null ? (
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={r}
                  stroke={colors.accent}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${c} ${c}`}
                  strokeDashoffset={c * (1 - d.best / 100)}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              ) : null}
            </Svg>
            <Text style={[styles.num, d.isToday && { color: colors.white }]}>{d.date.getDate()}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  labelToday: { color: colors.text, fontWeight: '800' },
  num: { fontSize: 13, fontWeight: '700', color: colors.text },
});
