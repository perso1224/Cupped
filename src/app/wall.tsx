import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, useWindowDimensions, View, type TextProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bean } from '../components/coffee';
import { CloseButton } from '../components/NavButtons';
import type { CardHandle } from '../components/ShareCard';
import { PillButton, Segmented } from '../components/ui';
import { BRAND } from '../config/brand';
import { cardTheme } from '../config/palateThemes';
import { tr, upper } from '../i18n/tr';
import { computePalateTypeId, getPalateType } from '../lib/palate';
import { longestStreak, yearWall } from '../lib/progress';
import { shareViewSafely } from '../lib/share';
import { photoUrl } from '../lib/storage';
import { useDamakCode } from '../lib/useDamakCode';
import { useEntries } from '../lib/useEntries';
import { colors, fonts, type } from '../theme';

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/**
 * Fincan Duvarı: yılın her günü bir kare (12 ay × gün). Fincan fotoğrafı varsa fotoğraf, yoksa skora göre
 * renkli kare, boş gün soluk. Yıl sonu paylaşımı için 9:16 poster.
 */
export default function Wall() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const loaded = useEntries();
  const entries = useMemo(() => loaded ?? [], [loaded]);
  const code = useDamakCode();
  const now = new Date();
  const thisYear = now.getFullYear();
  const years = useMemo(() => {
    const ys = new Set(entries.map((e) => new Date(e.createdAt).getFullYear()));
    ys.add(thisYear);
    return [...ys].sort((a, b) => b - a).slice(0, 3);
  }, [entries, thisYear]);
  // Afişten gelince afişteki yıl (Ocak'ta geçen yıl); yoksa bu yıl
  const { year: yearParam } = useLocalSearchParams<{ year?: string }>();
  const [year, setYear] = useState(() => {
    const y = Number(yearParam);
    return Number.isInteger(y) && y > 2000 && y <= now.getFullYear() ? y : now.getFullYear();
  });
  const cardRef = useRef<CardHandle>(null);
  const [sharing, setSharing] = useState(false);

  const list = entries.filter((e) => new Date(e.createdAt).getFullYear() === year);
  const wall = yearWall(entries, year, now);
  const typeId = list.length ? computePalateTypeId(list, { wholePeriod: true }) : null;
  const th = cardTheme(typeId);
  const activeDays = wall.flat().filter((d) => d.best).length;

  const posterW = Math.min(width - 32, ((height - insets.top - insets.bottom - 150) * 9) / 16);
  const posterH = (posterW * 16) / 9;
  const u = posterW / 100;
  const pad = u * 6;
  const labelW = u * 7;
  const gap = Math.max(1, u * 0.35);
  const cell = (posterW - pad * 2 - labelW - gap * 31) / 31;
  // Kareler dikine uzun: ızgara posterin ortasını doldursun
  const cellH = cell * 1.9;

  async function share() {
    if (sharing) return;
    setSharing(true);
    if ((await shareViewSafely(cardRef, 'palateCard')) === 'error') Alert.alert(tr.result.shareError);
    setSharing(false);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.hint}>{tr.wall.title}</Text>
        <PillButton glass label={tr.palateCard.share} onPress={share} disabled={sharing || !list.length} style={styles.shareBtn} />
      </View>
      {years.length > 1 ? (
        <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
          <Segmented value={String(year)} onChange={(v) => setYear(Number(v))} options={years.map((y) => ({ value: String(y), label: String(y) }))} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 14 }}>
        <View style={{ borderRadius: u * 5, overflow: 'hidden' }}>
          <View ref={cardRef} collapsable={false} style={{ width: posterW, height: posterH, backgroundColor: th.bg, padding: pad, justifyContent: 'space-between' }}>
            <View>
              <T style={{ color: th.accent, fontSize: u * 3.3, fontWeight: '800', letterSpacing: 1.6 }}>{upper(tr.wall.kicker)}</T>
              <T style={{ color: th.fg, fontSize: u * 16, fontFamily: fonts.heavy, marginTop: u * 1 }}>{year}</T>
              <T style={{ color: th.muted, fontSize: u * 3.8, marginTop: -u * 1 }}>{tr.wall.sub(list.length, activeDays)}</T>
            </View>

            {/* Izgara: her satır bir ay */}
            <View>
              {wall.map((days, m) => (
                <View key={m} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: gap * 3 }}>
                  <T style={{ width: labelW, color: th.muted, fontSize: u * 2.6, fontWeight: '700' }}>{MONTHS[m]}</T>
                  {days.map((d) => {
                    const uri = d.best?.photoUri ? photoUrl(d.best.photoUri) : null;
                    const base = { width: cell, height: cellH, marginRight: gap, borderRadius: cell * 0.22 };
                    if (uri) return <Image key={d.key} source={{ uri }} style={base} />;
                    if (d.best) return <View key={d.key} style={[base, { backgroundColor: th.accent, opacity: 0.45 + (d.best.score / 100) * 0.55 }]} />;
                    return <View key={d.key} style={[base, d.future ? { borderWidth: StyleSheet.hairlineWidth, borderColor: th.muted, opacity: 0.35 } : { backgroundColor: th.fg, opacity: 0.08 }]} />;
                  })}
                </View>
              ))}
            </View>

            <View>
              <View style={[styles.stats, { borderColor: th.muted }]}>
                {(
                  [
                    [list.length, tr.palateCard.cups],
                    [activeDays, tr.wall.days],
                    [longestStreak(list), tr.wall.streak],
                  ] as const
                )
                  .filter(([v]) => v > 0)
                  .map(([v, l], i) => (
                    <View key={l} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: th.muted }]}>
                      <T style={{ color: th.fg, fontSize: u * 6.5, fontFamily: fonts.display }}>{v}</T>
                      <T style={{ color: th.muted, fontSize: u * 2.8, fontWeight: '600' }}>{l}</T>
                    </View>
                  ))}
              </View>
              <View style={[styles.rowBetween, { marginTop: u * 4 }]}>
                <View>
                  <T style={{ color: th.muted, fontSize: u * 3.3, fontWeight: '600' }}>{typeId ? getPalateType(typeId).name : tr.card.question}</T>
                  {code ? <T style={{ color: th.fg, fontSize: u * 3.2, fontWeight: '700', marginTop: 2 }}>{tr.match.cardCode(code)}</T> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Bean size={u * 5} color={th.accent} line={th.bg} />
                  <T style={{ color: th.fg, fontSize: u * 5.6, fontFamily: fonts.heavy }}>{BRAND.name}</T>
                </View>
              </View>
            </View>
          </View>
        </View>
        {!list.length ? <Text style={[styles.hint, { marginTop: 14 }]}>{tr.wall.empty}</Text> : null}
      </ScrollView>
    </View>
  );
}

/** Kaydedilen görselde yazı boyutu telefonun yazı ayarından etkilenmesin. */
function T(props: TextProps) {
  return <Text allowFontScaling={false} {...props} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  hint: { ...type.footnote, fontWeight: '600' },
  shareBtn: { height: 36, paddingHorizontal: 16 },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
