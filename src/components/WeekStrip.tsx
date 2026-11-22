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
          // Gün tek öğe olarak okunur: "Pt 16, fincan var, en iyi skor 72" (renk tek başına bilgi taşımasın)
          <View
            key={d.key}
            style={styles.day}
            accessible
            accessibilityLabel={`${tr.weekdaysLong[i]} ${d.date.getDate()}${d.isToday ? `, ${tr.a11y.today}` : ''}, ${done ? tr.a11y.cupBest(d.best!) : d.isFuture ? tr.a11y.future : tr.a11y.noCup}`}
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.label, d.isToday && styles.labelToday]}>{tr.weekdaysShort[i]}</Text>
            <View
              style={[
                styles.stamp,
                done ? styles.done : d.isFuture ? styles.future : styles.empty,
                d.isToday && (done ? styles.todayDone : styles.today),
              ]}
            >
              <Text maxFontSizeMultiplier={1.2} style={[styles.num, done && { color: colors.onColor }, d.isFuture && { color: colors.muted }]}>{d.date.getDate()}</Text>
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
