import * as Brightness from 'expo-brightness';
import { useContentSize } from '../lib/contentWidth';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, Text, View, type TextProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CardHandle } from '../components/ShareCard';
import { BRAND } from '../config/brand';
import { tr, upper } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { memberNo } from '../lib/fingerprint';
import { Emblem, monogram } from '../components/Emblem';
import { encodeProfile, tasteProfile } from '../lib/match';
import { noteShares, profileSummary } from '../lib/progress';
import { shareViewSafely } from '../lib/share';
import { useEntries } from '../lib/useEntries';
import { useProfile } from '../lib/useProfile';
import { Bean } from '../components/coffee';
import { cardTheme, type CardTheme } from '../config/palateThemes';
import { CloseButton } from '../components/NavButtons';
import { PillButton } from '../components/ui';
import { colors, fonts, type } from '../theme';

/** "Göster" modu: tam ekran Damak Kartı. Parlaklık artar, ekran kapanmaz. */
export default function PalateCard() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useContentSize();
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
      // Android: sabit değer yazmak pencereyi o parlaklığa kilitler (otomatik parlaklık durur); sisteme geri bırak.
      if (Platform.OS === 'android') Brightness.restoreSystemBrightnessAsync().catch(() => {});
      else if (original.current !== null) Brightness.setBrightnessAsync(original.current).catch(() => {});
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
  const frameW = Math.min(width - 32, ((height - insets.top - insets.bottom - 80) * 9) / 16);
  const frameH = (frameW * 16) / 9;
  const u = frameW / 100;
  const th = cardTheme(typeId);
  const taste = s.cups && typeId ? tasteProfile(entries ?? [], typeId) : null;
  const damakCode = taste ? encodeProfile(taste) : null;
  const notes = noteShares(entries ?? []).slice(0, 4);
  const since = profile?.onboardedAt ? new Date(profile.onboardedAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : null;

  async function share() {
    if (busy.current) return;
    busy.current = true;
    setSharing(true);
    if ((await shareViewSafely(cardRef, 'palateCard')) === 'error') Alert.alert(tr.result.shareError);
    busy.current = false;
    setSharing(false);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topBar}>
        <CloseButton />
        <Text style={styles.hint}>{tr.palateCard.hint}</Text>
        {type && s.cups > 0 ? (
          <PillButton glass label={tr.palateCard.share} onPress={share} disabled={sharing} style={styles.shareBtn} />
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <View style={styles.center}>
        {/* Ekranda yuvarlak köşeli görünür; paylaşılan görsel (iç kutu) köşesiz, tam renkli 9:16 */}
        <View style={{ borderRadius: u * 6, overflow: 'hidden' }}>
          <View ref={cardRef} collapsable={false} style={[styles.card, { width: frameW, height: frameH, padding: u * 7, backgroundColor: th.bg }]}>
            {/* Üst: kimlik başlığı ve kart numarası */}
            <View>
              <View style={styles.rowBetween}>
                <T style={[styles.kicker, { fontSize: u * 3.2, color: th.accent }]}>{upper(s.palateTypeId ? tr.palateCard.idTitle : tr.profile.starter)}</T>
                <T style={[styles.kicker, { fontSize: u * 3.2, color: th.muted }]}>{tr.palateCard.no(memberNo(profile?.onboardedAt))}</T>
              </View>
              {profile?.nickname ? <T style={[styles.nick, { fontSize: u * 4.4, color: th.fg }]}>{profile.nickname}</T> : null}
              {/* Damak Uyumu kodu: kartı gören arkadaş kendi uygulamasında yazıp uyumu görebilir */}
              {damakCode ? <T style={{ color: th.muted, fontSize: u * 3.2, fontWeight: '700', letterSpacing: 1, marginTop: u * 1.5 }}>{upper(tr.match.cardCode(damakCode))}</T> : null}
            </View>

            {/* Amblem: kişiye özel damak parmak izi + damga yazısı + tip monogramı */}
            {type ? <Emblem size={frameW * 0.62} seed={`${profile?.nickname ?? ''}:${type.id}`} cups={s.cups} notes={notes} theme={th} monogram={monogram(type.name)} /> : null}

            <View>
              {type ? (
                <>
                  <T style={[styles.typeName, { fontSize: u * 10.5, lineHeight: u * 11.5, color: th.fg }]} adjustsFontSizeToFit numberOfLines={2}>
                    {type.name}
                  </T>
                  <T style={[styles.tagline, { fontSize: u * 3.9, lineHeight: u * 5.4, marginTop: u * 2, color: th.muted }]} numberOfLines={3}>
                    {type.tagline}
                  </T>
                  {s.cups === 0 ? <T style={[styles.tagline, { fontSize: u * 3.6, marginTop: u * 3, color: th.muted }]}>{tr.palateCard.starterNote}</T> : null}
                </>
              ) : (
                <T style={[styles.typeName, { fontSize: u * 6, lineHeight: u * 8, color: th.fg }]}>{tr.palateCard.empty}</T>
              )}

              {type && s.cups > 0 ? (
                <View style={[styles.stats, { marginTop: u * 6, borderColor: th.muted }]}>
                  {/* Değeri 0 olan bilgi kartta gösterilmez (ör. hiç kafeye gidilmediyse "0 Mekan" yok) */}
                  {(
                    [
                      [s.cups, tr.palateCard.cups],
                      [s.avg, tr.palateCard.avg],
                      [s.places, tr.palateCard.places],
                      [s.methods, tr.palateCard.methods],
                    ] as const
                  )
                    .filter(([v]) => v > 0)
                    .map(([v, l], i) => (
                      <Stat key={l} u={u} th={th} value={v} label={l} divider={i > 0} />
                    ))}
                </View>
              ) : null}

              <View style={[styles.rowBetween, { marginTop: u * 6 }]}>
                <T style={[styles.since, { fontSize: u * 3.3, color: th.muted }]}>
                  {s.streak > 0 ? tr.palateCard.streakLine(s.streak) : since ? tr.palateCard.since(since) : tr.card.question}
                </T>
                <View style={styles.brandRow}>
                  <Bean size={u * 5} color={th.accent} line={th.bg} />
                  <T style={[styles.brand, { fontSize: u * 5.6, color: th.fg }]}>{BRAND.name}</T>
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

function Stat({ u, th, value, label, divider }: { u: number; th: CardTheme; value: number; label: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: th.muted }]}>
      <T style={[styles.statValue, { fontSize: u * 7, color: th.fg }]}>{value}</T>
      <T style={[styles.statLabel, { fontSize: u * 2.9, color: th.muted }]}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  hint: { ...type.footnote, fontWeight: '600' },
  shareBtn: { height: 36, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontWeight: '800', letterSpacing: 1.6 },
  nick: { fontFamily: fonts.semibold, marginTop: 6 },
  typeName: { fontFamily: fonts.heavy },
  tagline: { fontStyle: 'italic' },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.display },
  statLabel: { fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },
  since: { fontWeight: '600' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontFamily: fonts.heavy },
});
