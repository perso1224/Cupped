import { router } from 'expo-router';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { METHOD_ICON, METHOD_INK, soft } from '../config/methodStyle';
import { Stars } from './Stars';
import { Icon } from './Icon';
import { PressScale } from './motion';
import { tr } from '../i18n/tr';
import { thumbUrl } from '../lib/storage';
import type { CupEntry } from '../lib/types';
import { colors, isDark, type } from '../theme';
import { placeLabel } from './ShareCard';
import { Card } from './ui';

export function timeLabel(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  );
}

/** timeOnly: gün başlığı altında listelenirken sadece saat (tarih tekrar etmesin). */
/** showParts: skor parçalarını küçük çipler olarak göster (Cal AI'daki makro çipleri gibi). */
/** plain: gruplu liste içinde (kartsız, gölgesiz) satır. */
export function CupRow({ entry, timeOnly, showParts, plain }: { entry: CupEntry; timeOnly?: boolean; showParts?: boolean; plain?: boolean }) {
  const Wrap = plain ? View : Card;
  const chips = showParts
    ? (['effort', 'discovery', 'depth', 'selectivity'] as const).filter((k) => entry.parts[k] !== 0)
    : [];
  const thumb = thumbUrl(entry.photoUri);
  const { width } = useWindowDimensions();
  const narrow = width < 360; // küçük ekranda daha küçük görsel, satır uzamasın
  const size = narrow ? 48 : 64;
  const ink = METHOD_INK[entry.method];
  return (
    <PressScale onPress={() => router.push(`/cup/${entry.id}`)} scaleTo={0.97}>
      <Wrap style={plain ? styles.plainRow : styles.row}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={[styles.thumb, { width: size, height: size }]} />
        ) : (
          // Fotoğrafsız fincan: yöntemin kendi simgesi ve rengi (hepsi aynı fincan simgesi olmasın)
          <View style={[styles.thumb, styles.thumbEmpty, { width: size, height: size, backgroundColor: soft(ink, isDark ? 0.22 : 0.14) }]}>
            <Icon name={METHOD_ICON[entry.method]} size={narrow ? 20 : 26} color={ink} />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: narrow ? 10 : 14 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {tr.methods[entry.method]}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {placeLabel(entry)}
          </Text>
          <View style={styles.timeRow}>
            <Text style={styles.rowTime}>
              {timeOnly
                ? new Date(entry.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : timeLabel(entry.createdAt)}
            </Text>
            <Stars value={entry.rating} size={11} />
          </View>
          {chips.length ? (
            // Tek satır, sade: "+12 Emek · +5 Keşif · +10 Derinlik" (dar ekranda satır uzamasın)
            <Text style={styles.parts} numberOfLines={1}>
              {chips.map((k) => `${entry.parts[k] > 0 ? '+' : ''}${entry.parts[k]} ${tr.result.breakdown[k]}`).join(' · ')}
            </Text>
          ) : null}
        </View>
        <Text style={styles.rowScore}>{entry.score}</Text>
      </Wrap>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  plainRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
  thumb: { width: 64, height: 64, borderRadius: 14 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  rowTime: { fontSize: 12, color: colors.muted },
  parts: { fontSize: 12, fontWeight: '700', color: colors.accentText, marginTop: 4 },
  rowScore: { ...type.stat, minWidth: 44, textAlign: 'right', marginLeft: 8 },
});
