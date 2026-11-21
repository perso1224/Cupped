import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../config/brand';
import { tr } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import type { PeriodReport } from '../lib/progress';
import { colors } from '../theme';
import type { CardHandle } from './ShareCard';

function rangeLabel(r: PeriodReport, kind: 'week' | 'month') {
  if (kind === 'month') return r.start.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const last = new Date(r.end.getTime() - 1);
  const f = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `${f(r.start)} – ${f(last)}`;
}

/** 9:16 haftalık rapor / aylık "Damak Özeti" paylaşım kartı. */
export function ReportCard({
  report,
  kind,
  width,
  ref,
}: {
  report: PeriodReport;
  kind: 'week' | 'month';
  width: number;
  ref?: Ref<CardHandle>;
}) {
  const height = (width * 16) / 9;
  const type = report.palateTypeId ? getPalateType(report.palateTypeId) : null;
  const big = width * 0.2;

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height }]}>
      <Text style={styles.kicker}>{kind === 'week' ? tr.progress.weekCardTitle : tr.progress.monthCardTitle}</Text>
      <Text style={styles.range}>{rangeLabel(report, kind)}</Text>

      <View style={{ marginTop: height * 0.05 }}>
        <Text style={[styles.big, { fontSize: big }]}>{report.palateScore}</Text>
        <Text style={styles.bigLabel}>{tr.progress.weeklyScore}</Text>
      </View>

      <View style={styles.grid}>
        <Stat value={report.cups} label={tr.progress.cups} />
        <Stat value={report.avg} label={tr.progress.avg} />
        <Stat value={report.places} label={tr.progress.places} />
        <Stat value={report.newPlaces} label={tr.progress.newPlaces} />
      </View>

      {type ? (
        <View style={styles.typeBox}>
          <Text style={styles.typeLabel}>{tr.progress.periodType}</Text>
          <Text style={[styles.typeName, { fontSize: width * 0.075 }]} numberOfLines={1} adjustsFontSizeToFit>
            {type.name}
          </Text>
          {report.topMethod ? (
            <Text style={styles.typeSub}>
              {tr.progress.topMethod}: {tr.methods[report.topMethod]}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.question}>{tr.card.question}</Text>
        <Text style={styles.brand}>{BRAND.name}</Text>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.black, borderRadius: 28, overflow: 'hidden', padding: 24 },
  kicker: { color: colors.accent, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  range: { color: colors.white, fontSize: 20, fontWeight: '800', marginTop: 6 },
  big: { color: colors.white, fontWeight: '900', letterSpacing: -2 },
  bigLabel: { color: '#BDB6AC', fontSize: 14, fontWeight: '600', marginTop: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 },
  stat: { width: '50%', paddingVertical: 8 },
  statValue: { color: colors.white, fontSize: 30, fontWeight: '900' },
  statLabel: { color: '#BDB6AC', fontSize: 13 },
  typeBox: { marginTop: 16, backgroundColor: '#222', borderRadius: 20, padding: 16 },
  typeLabel: { color: '#BDB6AC', fontSize: 12, fontWeight: '700' },
  typeName: { color: colors.white, fontWeight: '900', marginTop: 4 },
  typeSub: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: 4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  question: { fontSize: 13, fontWeight: '600', color: '#BDB6AC' },
  brand: { fontSize: 18, fontWeight: '900', color: colors.white, letterSpacing: -0.5 },
});
