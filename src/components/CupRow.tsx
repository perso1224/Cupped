import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PressScale } from './motion';
import { tr } from '../i18n/tr';
import { photoUrl } from '../lib/storage';
import type { CupEntry } from '../lib/types';
import { colors } from '../theme';
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
export function CupRow({ entry, timeOnly, showParts }: { entry: CupEntry; timeOnly?: boolean; showParts?: boolean }) {
  const chips = showParts
    ? (['effort', 'discovery', 'depth', 'selectivity'] as const).filter((k) => entry.parts[k] !== 0)
    : [];
  return (
    <PressScale onPress={() => router.push(`/cup/${entry.id}`)} scaleTo={0.97}>
      <Card style={styles.row}>
        {entry.photoUri ? (
          <Image source={{ uri: photoUrl(entry.photoUri)! }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={{ fontSize: 26 }}>☕</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {tr.methods[entry.method]}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {placeLabel(entry)}
          </Text>
          <Text style={styles.rowTime}>
            {timeOnly
              ? new Date(entry.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
              : timeLabel(entry.createdAt)}
          </Text>
          {chips.length ? (
            <View style={styles.chips}>
              {chips.map((k) => (
                <Text key={k} style={[styles.chip, entry.parts[k] < 0 && styles.chipNeg]}>
                  {entry.parts[k] > 0 ? '+' : ''}
                  {entry.parts[k]} {tr.result.breakdown[k]}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <Text style={styles.rowScore}>{entry.score}</Text>
      </Card>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
  thumb: { width: 64, height: 64, borderRadius: 14 },
  thumbEmpty: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  rowTime: { fontSize: 12, color: colors.muted, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  chip: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  chipNeg: { backgroundColor: colors.line, color: colors.muted },
  rowScore: { fontSize: 30, fontWeight: '900', color: colors.text, marginLeft: 8 },
});
