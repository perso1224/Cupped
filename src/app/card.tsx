import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CardHandle } from '../components/ShareCard';
import { BRAND } from '../config/brand';
import { tr, upper } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { profileSummary } from '../lib/progress';
import { shareViewAsImage } from '../lib/share';
import { useEntries } from '../lib/useEntries';
import { useProfile } from '../lib/useProfile';
import { colors } from '../theme';

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
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.hint}>{tr.palateCard.hint}</Text>
        {type ? (
          <Pressable onPress={share} disabled={sharing} hitSlop={12}>
            <Text style={styles.share}>{tr.palateCard.share}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={styles.center}>
        <View
          ref={cardRef}
          collapsable={false}
          style={{ width: frameW, height: frameH, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
        >
        <View style={[styles.card, { width: cardWidth, minHeight: Math.min(520, frameH - 32) }]}>
          <Text style={styles.kicker}>{upper(s.palateTypeId ? tr.palateCard.title : tr.profile.starter)}</Text>
          {profile?.nickname ? <Text style={styles.nick}>@{profile.nickname}</Text> : null}
          {type ? (
            <>
              <Text style={[styles.typeName, { fontSize: cardWidth * 0.12 }]} adjustsFontSizeToFit numberOfLines={2}>
                {type.name}
              </Text>
              <Text style={styles.tagline}>{type.tagline}</Text>

              {s.cups === 0 ? (
                <Text style={styles.starterNote}>{tr.palateCard.starterNote}</Text>
              ) : (
                <>
                  {s.streak > 0 ? <Text style={styles.streak}>🔥 {tr.palateCard.streakLine(s.streak)}</Text> : null}
                  <View style={styles.grid}>
                    <Stat value={s.cups} label={tr.palateCard.cups} big />
                    <Stat value={s.avg} label={tr.palateCard.avg} big />
                    <Stat value={s.places} label={tr.palateCard.places} />
                    <Stat value={s.methods} label={tr.palateCard.methods} />
                  </View>
                </>
              )}
            </>
          ) : (
            <Text style={styles.empty}>{tr.palateCard.empty}</Text>
          )}

          <View style={styles.footer}>
            <Text style={styles.question}>{tr.card.question}</Text>
            <Text style={styles.brand}>{BRAND.name}</Text>
          </View>
        </View>
        </View>
      </View>
    </View>
  );
}

function Stat({ value, label, big }: { value: number; label: string; big?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, big && { fontSize: 48 }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, fontWeight: '700', color: colors.text },
  hint: { fontSize: 14, fontWeight: '600', color: colors.muted },
  share: { fontSize: 15, fontWeight: '800', color: colors.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.black, borderRadius: 32, padding: 28 },
  kicker: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },
  nick: { color: '#BDB6AC', fontSize: 16, fontWeight: '700', marginTop: 8 },
  typeName: { color: colors.white, fontWeight: '900', marginTop: 14, letterSpacing: -1 },
  tagline: { color: '#CFC8BE', fontSize: 16, lineHeight: 22, marginTop: 10 },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  levelPill: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  levelText: { color: colors.black, fontWeight: '800', fontSize: 14 },
  streak: { color: colors.white, fontWeight: '800', fontSize: 16, marginTop: 18 },
  starterNote: { color: '#BDB6AC', fontSize: 15, marginTop: 18, lineHeight: 21, marginBottom: 56 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, marginBottom: 56 },
  stat: { width: '50%', paddingVertical: 8 },
  statValue: { color: colors.white, fontSize: 32, fontWeight: '900' },
  statLabel: { color: '#BDB6AC', fontSize: 13, marginTop: -2 },
  empty: { color: colors.white, fontSize: 18, marginTop: 24, lineHeight: 26 },
  footer: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: { fontSize: 13, fontWeight: '600', color: '#BDB6AC' },
  brand: { fontSize: 18, fontWeight: '900', color: colors.white, letterSpacing: -0.5 },
});
