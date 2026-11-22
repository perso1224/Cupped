import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { TrendPoint } from '../lib/progress';
import { colors, type } from '../theme';
import { haptic } from './motion';

const H = 170;
const PAD_L = 28; // soldaki skor etiketleri
const PAD_T = 34; // seçili noktanın balonu için üst boşluk
const PAD_B = 22; // alttaki tarih etiketleri

const fmt = (t: number, withYear: boolean) =>
  new Date(t).toLocaleDateString('tr-TR', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });

/** Skor gidişatı çizgisi: altı yumuşak dolgulu, kesikli yatay çizgiler, dokunulan noktada balon. */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const selected = sel !== null && sel < points.length ? sel : points.length - 1;

  const vals = points.map((p) => p.avg);
  const minV = vals.reduce((m, v) => (v < m ? v : m), Infinity);
  const maxV = vals.reduce((m, v) => (v > m ? v : m), -Infinity);
  const lo = Math.max(0, Math.floor((minV - 5) / 10) * 10);
  const hi = Math.min(100, Math.ceil((maxV + 5) / 10) * 10);
  const span = Math.max(10, hi - lo);
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const plotW = Math.max(1, w - PAD_L - 8);
  const plotH = H - PAD_T - PAD_B;
  const x = (t: number) => PAD_L + (t1 === t0 ? plotW / 2 : ((t - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD_T + (1 - (v - lo) / span) * plotH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.avg).toFixed(1)}`).join(' ');
  const area = `${line} L${x(t1).toFixed(1)},${PAD_T + plotH} L${x(t0).toFixed(1)},${PAD_T + plotH} Z`;
  const grid = [lo, lo + span / 2, lo + span].map((v) => Math.round(v));
  const sp = points[selected];
  const withYear = new Date(t0).getFullYear() !== new Date(t1).getFullYear();

  function pick(px: number) {
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i].t) - px) < Math.abs(x(points[best].t) - px)) best = i;
    if (best !== selected) haptic.select();
    setSel(best);
  }

  const bubbleW = 92;
  const bx = sp ? Math.max(0, Math.min(w - bubbleW, x(sp.t) - bubbleW / 2)) : 0;

  return (
    <Pressable
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onPress={(e) => pick(e.nativeEvent.locationX)}
      accessibilityRole="image"
      accessibilityLabel={`Skor grafiği: ${points.length} nokta, son değer ${points[points.length - 1].avg}`}
      style={{ height: H }}
    >
      {w > 0 ? (
        <>
          <Svg width={w} height={H}>
            <Defs>
              <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0.28} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {grid.map((v) => (
              <Line key={v} x1={PAD_L} x2={w - 8} y1={y(v)} y2={y(v)} stroke={colors.line} strokeDasharray="3 5" strokeWidth={1} />
            ))}
            <Path d={area} fill="url(#trendFill)" />
            <Path d={line} stroke={colors.text} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {sp ? (
              <>
                <Line x1={x(sp.t)} x2={x(sp.t)} y1={y(sp.avg)} y2={PAD_T + plotH} stroke={colors.accent} strokeWidth={1.5} />
                <Circle cx={x(sp.t)} cy={y(sp.avg)} r={6} fill={colors.card} stroke={colors.accent} strokeWidth={3} />
              </>
            ) : null}
          </Svg>
          {grid.map((v) => (
            <Text key={v} style={[styles.axis, { position: 'absolute', left: 0, top: y(v) - 8 }]}>
              {v}
            </Text>
          ))}
          <Text style={[styles.axis, { position: 'absolute', left: PAD_L, bottom: 0 }]}>{fmt(t0, withYear)}</Text>
          <Text style={[styles.axis, { position: 'absolute', right: 8, bottom: 0 }]}>{fmt(t1, withYear)}</Text>
          {sp ? (
            <View style={[styles.bubble, { left: bx, width: bubbleW }]} pointerEvents="none">
              <Text style={styles.bubbleValue}>ort. {sp.avg}</Text>
              <Text style={styles.bubbleDate}>{fmt(sp.t, withYear)}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  axis: { ...type.caption, fontSize: 11 },
  bubble: { position: 'absolute', top: 0, backgroundColor: colors.black, borderRadius: 10, paddingVertical: 4, alignItems: 'center' },
  bubbleValue: { color: colors.white, fontSize: 13, fontWeight: '700' },
  bubbleDate: { color: colors.mutedOnDark, fontSize: 11 },
});
