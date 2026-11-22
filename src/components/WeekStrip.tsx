import { StyleSheet, Text, View } from 'react-native';
import { tr } from '../i18n/tr';
import type { StripDay } from '../lib/progress';
import { colors, tint } from '../theme';

const SIZE = 36;

/**
 * Haftalık gün şeridi, pasaport damgası gibi: fincan eklenen gün koyu kahve dolu,
 * bugün kesikli amber çerçeveli, gelecek günler soluk.
 */
export function WeekStrip({ days }: { days: StripDay[] }) {
  return (
    <View style={styles.row}>
      {days.map((d, i) => {
        const done = d.best !== null;
        return (
          <View key={d.key} style={styles.day}>
            <Text style={[styles.label, d.isToday && styles.labelToday]}>{tr.weekdaysShort[i]}</Text>
            <View
              style={[
                styles.stamp,
                done ? styles.done : d.isFuture ? styles.future : styles.empty,
                d.isToday && (done ? styles.todayDone : styles.today),
              ]}
              accessibilityLabel={`${tr.weekdaysShort[i]} ${d.date.getDate()}${done ? `, en iyi skor ${d.best}` : ''}`}
            >
              <Text style={[styles.num, done && { color: colors.white }, d.isFuture && { color: colors.tertiary }]}>{d.date.getDate()}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  labelToday: { color: colors.text, fontWeight: '800' },
  stamp: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: tint.espresso },
  empty: { borderWidth: 1.5, borderColor: colors.line },
  future: { borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed' },
  today: { borderWidth: 2, borderColor: colors.accent, borderStyle: 'dashed' },
  todayDone: { borderWidth: 2.5, borderColor: colors.accent },
  num: { fontSize: 13, fontWeight: '700', color: colors.text },
});
