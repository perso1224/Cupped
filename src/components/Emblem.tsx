import { View } from 'react-native';
import Svg, { Circle, Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
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
  const stamp = `${BRAND.name.toLocaleUpperCase('tr-TR')} · ${tr.palateCard.stamp} · `;
  return (
    <View style={{ alignSelf: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Defs>
          <Path id="stampCircle" d={`M ${c - textR},${c} a ${textR},${textR} 0 1,1 ${textR * 2},0 a ${textR},${textR} 0 1,1 ${-textR * 2},0`} />
        </Defs>
        <Circle cx={c} cy={c} r={size * 0.49} stroke={th.accent} strokeWidth={1.5} fill="none" opacity={0.6} />
        <Circle cx={c} cy={c} r={size * 0.41} stroke={th.accent} strokeWidth={1} fill="none" opacity={0.4} />
        <SvgText fill={th.accent} fontSize={size * 0.052} fontWeight="700" letterSpacing={size * 0.012}>
          <TextPath href="#stampCircle">{stamp.repeat(2)}</TextPath>
        </SvgText>
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

