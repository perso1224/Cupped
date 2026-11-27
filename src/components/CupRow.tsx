import { router } from 'expo-router';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Stars } from './Stars';
import { MethodGlyph } from './Glyph';
import { PressScale } from './motion';
import { tr } from '../i18n/tr';
import { thumbUrl } from '../lib/storage';
import type { CupEntry } from '../lib/types';
import { colors, type } from '../theme';
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
/** plain: gruplu liste içinde (kartsız, gölgesiz) satır. */
export function CupRow({ entry, timeOnly, plain }: { entry: CupEntry; timeOnly?: boolean; plain?: boolean }) {
  const Wrap = plain ? View : Card;
  const thumb = thumbUrl(entry.photoUri);
  const { width } = useWindowDimensions();
  const narrow = width < 360; // küçük ekranda daha küçük görsel, satır uzamasın
  const size = narrow ? 48 : 64;
  return (
    <PressScale onPress={() => router.push(`/cup/${entry.id}`)} scaleTo={0.97}>
      <Wrap style={plain ? styles.plainRow : styles.row}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={[styles.thumb, { width: size, height: size }]} />
        ) : (
          // Fotoğrafsız fincan: yöntemin kendi simgesi, sade zeminde
          <View style={[styles.thumb, styles.thumbEmpty, { width: size, height: size, backgroundColor: colors.surface }]}>
            <MethodGlyph method={entry.method} size={narrow ? 22 : 28} color={colors.muted} strokeWidth={1.75} />
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
            <Text style={styles.rowTime} numberOfLines={1}>
              {timeOnly
                ? new Date(entry.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : timeLabel(entry.createdAt)}
            </Text>
            {narrow ? null : <Stars value={entry.rating} size={11} />}
          </View>
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
  rowScore: { ...type.stat, minWidth: 44, textAlign: 'right', marginLeft: 8 },
});
