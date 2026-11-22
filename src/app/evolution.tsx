import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View, type TextProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bean } from '../components/coffee';
import { Icon } from '../components/Icon';
import { CloseButton } from '../components/NavButtons';
import type { CardHandle } from '../components/ShareCard';
import { PillButton } from '../components/ui';
import { BRAND } from '../config/brand';
import { cardTheme } from '../config/palateThemes';
import { tr, upper } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { shareViewAsImage } from '../lib/share';
import { useProfile } from '../lib/useProfile';
import { colors, fonts, type } from '../theme';

/** Damak Evrimi kartı: üst yarı eski tipin renginde, alt yarı yeni tipin renginde; 9:16 paylaşılabilir. */
export default function Evolution() {
  const { from, to } = useLocalSearchParams<{ from: string; to: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const profile = useProfile();
  const cardRef = useRef<CardHandle>(null);
  const [sharing, setSharing] = useState(false);
  const a = getPalateType(String(from));
  const b = getPalateType(String(to));
  const ta = cardTheme(a.id);
  const tb = cardTheme(b.id);
  const W = Math.min(width - 32, ((height - insets.top - insets.bottom - 80) * 9) / 16);
  const H = (W * 16) / 9;
  const u = W / 100;

  async function share() {
    if (sharing) return;
    setSharing(true);
    try {
      await shareViewAsImage(cardRef, 'palateCard');
    } catch {
      Alert.alert(tr.result.shareError);
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.hint}>{tr.evolution.title}</Text>
        <PillButton glass label={tr.palateCard.share} onPress={share} disabled={sharing} style={styles.shareBtn} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ borderRadius: u * 6, overflow: 'hidden' }}>
          <View ref={cardRef} collapsable={false} style={{ width: W, height: H }}>
            {/* Eski tip */}
            <View style={{ flex: 1, backgroundColor: ta.bg, padding: u * 7, justifyContent: 'space-between' }}>
              <View style={styles.rowBetween}>
                <T style={{ color: ta.accent, fontSize: u * 3.3, fontWeight: '800', letterSpacing: 1.6 }}>{upper(tr.evolution.kicker)}</T>
                {profile?.nickname ? <T style={{ color: ta.muted, fontSize: u * 3.6, fontWeight: '700' }}>{profile.nickname}</T> : null}
              </View>
              <View style={{ marginBottom: u * 7 }}>
                <T style={{ color: ta.muted, fontSize: u * 3.6, fontWeight: '700', letterSpacing: 1 }}>{upper(tr.evolution.from)}</T>
                <T style={{ color: ta.fg, fontSize: u * 9, fontFamily: fonts.display, opacity: 0.75 }} numberOfLines={2} adjustsFontSizeToFit>
                  {a.name}
                </T>
              </View>
            </View>
            {/* Geçiş oku */}
            <View style={[styles.arrow, { width: u * 16, height: u * 16, borderRadius: u * 8, marginLeft: -u * 8, marginTop: -u * 8, backgroundColor: tb.accent, borderColor: ta.bg }]}>
              <Icon name="arrow-down" size={u * 8} color={tb.bg} />
            </View>
            {/* Yeni tip */}
            <View style={{ flex: 1.3, backgroundColor: tb.bg, padding: u * 7, justifyContent: 'space-between' }}>
              <View style={{ marginTop: u * 8 }}>
                <T style={{ color: tb.muted, fontSize: u * 3.6, fontWeight: '700', letterSpacing: 1 }}>{upper(tr.evolution.to)}</T>
                <T style={{ color: tb.fg, fontSize: u * 11.5, lineHeight: u * 12.5, fontFamily: fonts.heavy }} numberOfLines={2} adjustsFontSizeToFit>
                  {b.name}
                </T>
                <T style={{ color: tb.muted, fontSize: u * 4, lineHeight: u * 5.6, marginTop: u * 2, fontStyle: 'italic' }} numberOfLines={3}>
                  {b.tagline}
                </T>
              </View>
              <View style={styles.rowBetween}>
                <T style={{ color: tb.muted, fontSize: u * 3.3, fontWeight: '600' }}>{tr.card.question}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Bean size={u * 5} color={tb.accent} line={tb.bg} />
                  <T style={{ color: tb.fg, fontSize: u * 5.6, fontFamily: fonts.heavy }}>{BRAND.name}</T>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  arrow: { position: 'absolute', left: '50%', top: '43.5%', zIndex: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
});
