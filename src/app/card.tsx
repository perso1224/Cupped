import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, StyleSheet, Text, useWindowDimensions, View, type TextProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CardHandle } from '../components/ShareCard';
import { BRAND } from '../config/brand';
import { tr, upper } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { profileSummary } from '../lib/progress';
import { shareViewAsImage } from '../lib/share';
import { useEntries } from '../lib/useEntries';
import { useProfile } from '../lib/useProfile';
import { Icon } from '../components/Icon';
import { CloseButton } from '../components/NavButtons';
import { PillButton } from '../components/ui';
import { colors, tint, type } from '../theme';

/** "Göster" modu: tam ekran Damak Kartı. Parlaklık artar, ekran kapanmaz. */
export default function PalateCard() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const entries = useEntries();
  const cardRef = useRef<CardHandle>(null);
  const [sharing, setSharing] = useState(false);
  const busy = useRef(false);

  // Parlaklığı en yükseğe çıkar; çıkarken ve uygulama arka plana geçerken eski haline getir.
  // (iOS, uygulamanın ayarladığı parlaklığı uygulama kapansa da korur; bu yüzden geri almak şart.)
  const original = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const raise = async () => {
      try {
        if (original.current === null) original.current = await Brightness.getBrightnessAsync();
        if (!cancelled) await Brightness.setBrightnessAsync(1);
      } catch {
        // Parlaklık ayarlanamazsa kart yine de gösterilir.
      }
    };
    const restore = () => {
      if (original.current !== null) Brightness.setBrightnessAsync(original.current).catch(() => {});
    };
    raise();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') raise();
      else restore();
    });
    return () => {
      cancelled = true;
      sub.remove();
      restore();
    };
  }, []);

  const s = profileSummary(entries ?? []);
  const profile = useProfile();
  const typeId = s.palateTypeId ?? profile?.starterTypeId ?? null;
  const type = typeId ? getPalateType(typeId) : null;
  // Paylaşılan görsel tam 9:16 olsun diye kart, ekrana sığan 9:16 bir çerçevenin içinde.
  const frameW = Math.min(width, ((height - insets.top - insets.bottom - 64) * 9) / 16);
  const frameH = (frameW * 16) / 9;
  const cardWidth = frameW - 32;
  const u = cardWidth / 100;

  async function share() {
    if (busy.current) return;
    busy.current = true;
    setSharing(true);
    try {
      await shareViewAsImage(cardRef, 'palateCard');
    } catch {
      Alert.alert(tr.result.shareError);
    } finally {
      busy.current = false;
      setSharing(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.hint}>{tr.palateCard.hint}</Text>
        {type && s.cups > 0 ? (
          <PillButton label={tr.palateCard.share} onPress={share} disabled={sharing} style={styles.shareBtn} />
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <View style={styles.center}>
        <View
          ref={cardRef}
          collapsable={false}
          style={{ width: frameW, height: frameH, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Ölçüler kart genişliğine göre (u = genişliğin %1'i): küçük ekranda taşmaz, görsel her telefonda aynı */}
          <View style={[styles.card, { width: cardWidth, height: frameH - 32, padding: u * 7, borderRadius: u * 8 }]}>
            <View>
              <T style={[styles.kicker, { fontSize: u * 3.4 }]}>{upper(s.palateTypeId ? tr.palateCard.title : tr.profile.starter)}</T>
              {profile?.nickname ? <T style={[styles.nick, { fontSize: u * 4.2 }]}>@{profile.nickname}</T> : null}
              {type ? (
                <>
                  <T style={[styles.typeName, { fontSize: u * 11, lineHeight: u * 12, marginTop: u * 3 }]} adjustsFontSizeToFit numberOfLines={2}>
                    {type.name}
                  </T>
                  <T style={[styles.tagline, { fontSize: u * 4.1, lineHeight: u * 5.8, marginTop: u * 2.5 }]} numberOfLines={3}>
                    {type.tagline}
                  </T>
                  {s.cups === 0 ? (
                    <T style={[styles.starterNote, { fontSize: u * 3.9, marginTop: u * 4 }]}>{tr.palateCard.starterNote}</T>
                  ) : s.streak > 0 ? (
                    <View style={[styles.streakRow, { marginTop: u * 4 }]}>
                      <Icon name="flame" size={u * 4.5} color={tint.cherry} />
                      <T style={[styles.streak, { fontSize: u * 4.1 }]}>{tr.palateCard.streakLine(s.streak)}</T>
                    </View>
                  ) : null}
                </>
              ) : (
                <T style={[styles.empty, { fontSize: u * 4.6 }]}>{tr.palateCard.empty}</T>
              )}
            </View>

            {type && s.cups > 0 ? (
              <View style={styles.grid}>
                <Stat u={u} value={s.cups} label={tr.palateCard.cups} big />
                <Stat u={u} value={s.avg} label={tr.palateCard.avg} big />
                <Stat u={u} value={s.places} label={tr.palateCard.places} />
                <Stat u={u} value={s.methods} label={tr.palateCard.methods} />
              </View>
            ) : null}

            <View style={styles.footer}>
              <T style={[styles.question, { fontSize: u * 3.4 }]}>{tr.card.question}</T>
              <T style={[styles.brand, { fontSize: u * 4.6 }]}>{BRAND.name}</T>
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

function Stat({ u, value, label, big }: { u: number; value: number; label: string; big?: boolean }) {
  return (
    <View style={[styles.stat, { paddingVertical: u * 1.5 }]}>
      <T style={[styles.statValue, { fontSize: big ? u * 11 : u * 7.5 }]}>{value}</T>
      <T style={[styles.statLabel, { fontSize: u * 3.3 }]}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  hint: { ...type.footnote, fontWeight: '600' },
  shareBtn: { height: 36, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.black, justifyContent: 'space-between' },
  kicker: { color: colors.accent, fontWeight: '800', letterSpacing: 1.4 },
  nick: { color: colors.mutedOnDark, fontWeight: '700', marginTop: 6 },
  typeName: { color: colors.white, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: colors.mutedOnDark },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streak: { color: colors.white, fontWeight: '700' },
  starterNote: { color: colors.mutedOnDark, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { width: '50%' },
  statValue: { color: colors.white, fontWeight: '800' },
  statLabel: { color: colors.mutedOnDark, marginTop: -2 },
  empty: { color: colors.white, marginTop: 24, lineHeight: 26 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  question: { fontWeight: '600', color: colors.mutedOnDark },
  brand: { fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
});
