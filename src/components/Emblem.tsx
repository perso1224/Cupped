import { View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { BRAND } from '../config/brand';
import type { CardTheme } from '../config/palateThemes';
import { tr } from '../i18n/tr';
import { fingerprintRings } from '../lib/fingerprint';
import type { NoteShare } from '../lib/progress';
import { fonts } from '../theme';

/** Tip adının baş harfleri: "Saf Yoğunluk" → "SY", "Demleme Filozofu" → "DF". */
export function monogram(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR');
}

/** Amblem: iç içe dalgalı halkalar (kahve halkası izi gibi), çevresinde damga yazısı, ortada monogram. */
export function Emblem({ size, seed, cups, notes, theme: th, monogram: mono }: { size: number; seed: string; cups: number; notes: NoteShare[]; theme: CardTheme; monogram: string }) {
  const c = size / 2;
  const rings = fingerprintRings({ seed, cups, notes, radius: size * 0.36, cx: c, cy: c });
  const textR = size * 0.45;
  const stamp = `${BRAND.name.toLocaleUpperCase('tr-TR')} · ${tr.palateCard.stamp} · `.repeat(2);
  const fs = size * 0.05;
  // Damga yazısı harf harf çemberin tamamına eşit dağılır (boşluk kalmaz, birleşme yeri görünmez)
  const chars = [...stamp];
  const weight = (ch: string) => (ch === ' ' ? 0.45 : ch === '·' ? 0.55 : 1);
  const total = chars.reduce((a, ch) => a + weight(ch), 0);
  let acc = 0;
  const placed = chars.map((ch) => {
    const w = weight(ch);
    const deg = ((acc + w / 2) / total) * 360;
    acc += w;
    return { ch, deg };
  });
  return (
    <View style={{ alignSelf: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={size * 0.49} stroke={th.accent} strokeWidth={1.5} fill="none" opacity={0.6} />
        <Circle cx={c} cy={c} r={size * 0.41} stroke={th.accent} strokeWidth={1} fill="none" opacity={0.4} />
        <G>
          {placed.map((p, i) =>
            p.ch === ' ' ? null : (
              <SvgText
                key={i}
                x={c}
                y={c - textR + fs * 0.36}
                fill={th.accent}
                fontSize={fs}
                fontWeight="700"
                textAnchor="middle"
                transform={`rotate(${p.deg.toFixed(2)} ${c} ${c})`}
              >
                {p.ch}
              </SvgText>
            ),
          )}
        </G>
        {rings.map((r, i) => (
          <Path key={i} d={r.d} stroke={th.fg} strokeWidth={r.width} opacity={r.opacity} fill="none" />
        ))}
        <Circle cx={c} cy={c} r={size * 0.1} fill={th.accent} />
        <SvgText x={c} y={c + size * 0.034} fill={th.bg} fontSize={size * 0.095} fontFamily={fonts.heavy} textAnchor="middle">
          {mono}
        </SvgText>
      </Svg>
    </View>
  );
}

