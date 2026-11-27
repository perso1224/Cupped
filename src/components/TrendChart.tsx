import { tr } from '../i18n/tr';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { TrendPoint } from '../lib/progress';
import { colors, type } from '../theme';
import { haptic } from './motion';

const H = 170;
const PAD_L = 28; // soldaki skor etiketleri
const PAD_T = 46; // seçili noktanın balonu için üst boşluk (balon en üstteki skor etiketini örtmesin)
const PAD_B = 22; // alttaki tarih etiketleri
const BUBBLE_H = 38;

const fmt = (t: number, withYear: boolean) =>
  new Date(t).toLocaleDateString('tr-TR', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });

/** Haftalık noktanın balonu: "23–29 Kas" (ay değişiyorsa "30 Kas – 6 Ara"). */
function weekLabel(t: number): string {
  const a = new Date(t);
  const b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6);
  const mon = (d: Date) => d.toLocaleDateString('tr-TR', { month: 'short' });
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${mon(b)}` : `${a.getDate()} ${mon(a)} – ${b.getDate()} ${mon(b)}`;
}

/**
 * Noktalardan geçen yumuşak eğri (monoton kübik): kırık çizgi gibi köşeli değil, noktalar arasında
 * taşma/aşırı salınım da yapmaz (eğri iki komşu noktanın arasında kalır).
 */
export function smoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (!n) return '';
  const f = (v: number) => v.toFixed(1);
  if (n < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)},${f(p.y)}`).join(' ');
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x || 1));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let out = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = (pts[i + 1].x - pts[i].x) / 3;
    out += ` C${f(pts[i].x + dx)},${f(pts[i].y + m[i] * dx)} ${f(pts[i + 1].x - dx)},${f(pts[i + 1].y - m[i + 1] * dx)} ${f(pts[i + 1].x)},${f(pts[i + 1].y)}`;
  }
  return out;
}

/** Skor gidişatı çizgisi: altı yumuşak dolgulu, kesikli yatay çizgiler, dokunulan noktada balon. */
export function TrendChart({ points, weekly = false }: { points: TrendPoint[]; weekly?: boolean }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const selected = sel !== null && sel < points.length ? sel : points.length - 1;

  const vals = points.map((p) => p.avg);
  const minV = vals.reduce((m, v) => (v < m ? v : m), Infinity);
  const maxV = vals.reduce((m, v) => (v > m ? v : m), -Infinity);
  // Yuvarlak eksen değerleri (ör. 40 / 60 / 80): alt ve üst sınır 20'nin katı
  const lo = Math.max(0, Math.floor((minV - 5) / 20) * 20);
  const hi = Math.min(100, Math.max(lo + 20, Math.ceil((maxV + 5) / 20) * 20));
  const span = Math.max(20, hi - lo);
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const plotW = Math.max(1, w - PAD_L - 8);
  const plotH = H - PAD_T - PAD_B;
  const x = (t: number) => PAD_L + (t1 === t0 ? plotW / 2 : ((t - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD_T + (1 - (v - lo) / span) * plotH;

  // Uzun aralar (hiç fincan olmayan dönemler) düz bir çizgiyle birleştirilmez: çizgi orada kopar
  const steps = points.slice(1).map((p, i) => p.t - points[i].t).sort((a, b) => a - b);
  const typical = steps.length ? steps[Math.floor(steps.length / 2)] : 0;
  const segments: TrendPoint[][] = [];
  points.forEach((p, i) => {
    if (i === 0 || (typical > 0 && p.t - points[i - 1].t > typical * 3)) segments.push([p]);
    else segments[segments.length - 1].push(p);
  });
  const segLine = (seg: TrendPoint[]) => smoothPath(seg.map((p) => ({ x: x(p.t), y: y(p.avg) })));
  const line = segments.map(segLine).join(' ');
  const area = segments
    .filter((seg) => seg.length > 1)
    .map((seg) => `${segLine(seg)} L${x(seg[seg.length - 1].t).toFixed(1)},${PAD_T + plotH} L${x(seg[0].t).toFixed(1)},${PAD_T + plotH} Z`)
    .join(' ');
  const grid = [lo, lo + span / 2, lo + span].map((v) => Math.round(v));
  const sp = points[selected];
  const withYear = new Date(t0).getFullYear() !== new Date(t1).getFullYear();

  function pick(px: number) {
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i].t) - px) < Math.abs(x(points[best].t) - px)) best = i;
    if (best !== selected) haptic.select();
    setSel(best);
  }

  const bubbleW = weekly ? 112 : 92;
  const bx = sp ? Math.max(0, Math.min(w - bubbleW, x(sp.t) - bubbleW / 2)) : 0;

  return (
    <Pressable
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onPress={(e) => pick(e.nativeEvent.locationX)}
      accessibilityRole="image"
      accessibilityLabel={tr.a11y.trend(points[0].avg, points[points.length - 1].avg, points.length)}
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
            <Path d={line} stroke={colors.text} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {/* Tek noktalık parçalar (öncesi ve sonrası uzun ara) çizgisiz kalmasın */}
            {segments
              .filter((seg) => seg.length === 1)
              .map((seg) => (
                <Circle key={seg[0].t} cx={x(seg[0].t)} cy={y(seg[0].avg)} r={3} fill={colors.text} />
              ))}
            {sp ? (
              <>
                {/* Balondan noktaya ince kılavuz: balon noktaya bağlı görünsün */}
                <Line x1={x(sp.t)} x2={x(sp.t)} y1={BUBBLE_H} y2={PAD_T + plotH} stroke={colors.accent} strokeWidth={1} strokeDasharray="2 3" />
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
          {/* Ortada bir tarih daha: zaman ekseni iki uçtan ibaret olmasın */}
          {t1 - t0 > 86400000 * 6 && plotW > 200 ? (
            <Text style={[styles.axis, { position: 'absolute', left: PAD_L + plotW / 2 - 40, width: 80, textAlign: 'center', bottom: 0 }]}>{fmt((t0 + t1) / 2, false)}</Text>
          ) : null}
          <Text style={[styles.axis, { position: 'absolute', right: 8, bottom: 0 }]}>{fmt(t1, withYear)}</Text>
          {sp ? (
            <View style={[styles.bubble, { left: bx, width: bubbleW }]} pointerEvents="none">
              <Text style={styles.bubbleValue}>ort. {sp.avg}</Text>
              <Text style={styles.bubbleDate}>{weekly ? weekLabel(sp.t) : fmt(sp.t, withYear)}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  axis: { ...type.caption, fontSize: 11 },
  bubble: { position: 'absolute', top: 0, height: BUBBLE_H, justifyContent: 'center', backgroundColor: colors.black, borderRadius: 10, alignItems: 'center' },
  bubbleValue: { color: colors.white, fontSize: 13, fontWeight: '700' },
  bubbleDate: { color: colors.mutedOnDark, fontSize: 11 },
});
