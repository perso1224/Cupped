import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { QRCode } from '../components/QRCode';
import { Alert, Keyboard, Platform, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View, type TextProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bean } from '../components/coffee';
import { BackSpacer, FloatingBack } from '../components/NavButtons';
import type { CardHandle } from '../components/ShareCard';
import { PillButton } from '../components/ui';
import { BRAND } from '../config/brand';
import { cardTheme, type CardTheme } from '../config/palateThemes';
import { tr, upper } from '../i18n/tr';
import { canonicalCode, compatibility, decodeCode, extractCode, encodeProfile, tasteProfile, type Match, type TasteProfile } from '../lib/match';
import { computePalateTypeId, getPalateType } from '../lib/palate';
import { shareViewSafely } from '../lib/share';
import { useEntries } from '../lib/useEntries';
import { useProfile } from '../lib/useProfile';
import { colors, fonts, layout, type } from '../theme';

/** Damak Uyumu: kendi kodun + arkadaşının kodu → telefonda hesaplanan uyum kartı (sunucu yok). */
export default function MatchScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const entries = useEntries() ?? [];
  const profile = useProfile();
  const myType = entries.length ? computePalateTypeId(entries) : (profile?.starterTypeId ?? 'classic_master');
  const mine = tasteProfile(entries, myType);
  const myCode = mine ? encodeProfile(mine) : null;
  // Arkadaşın paylaştığı bağlantıdan (cupped://match?code=…) gelindiyse kod hazır yazılı ve karşılaştırma kendiliğinden yapılır
  const { code: linkCode } = useLocalSearchParams<{ code?: string }>();
  const [input, setInput] = useState(() => (linkCode ? extractCode(String(linkCode)) ?? String(linkCode) : ''));
  // Hata yazının altında görünür (uyarı penceresi yerine)
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ friend: TasteProfile; match: Match; code: string } | null>(null);
  const cardRef = useRef<CardHandle>(null);
  const [sharing, setSharing] = useState(false);
  // QR okutma: tam ekran kamera; ilk okunan geçerli kod alınır
  const [scanning, setScanning] = useState(false);
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const scanned = useRef(false);
  async function openScanner() {
    const p = camPerm?.granted ? camPerm : await requestCamPerm();
    if (!p.granted) {
      Alert.alert(tr.match.scanNoPermission);
      return;
    }
    scanned.current = false;
    setScanning(true);
  }
  function onScanned(data: string) {
    if (scanned.current) return;
    const code = extractCode(data);
    if (!code) {
      setErr(tr.match.scanInvalid);
      return;
    }
    scanned.current = true;
    setScanning(false);
    setInput(code);
    find(code);
  }

  function find(raw: string = input) {
    Keyboard.dismiss();
    const friend = decodeCode(raw);
    if (!friend || !mine) {
      setResult(null); // eski sonuç ekranda kalıp yanıltmasın
      setErr(tr.match.invalid);
      return;
    }
    if (myCode && canonicalCode(raw) === canonicalCode(myCode)) {
      setResult(null);
      setErr(tr.match.ownCode);
      return;
    }
    setErr(null);
    setResult({ friend, match: compatibility(mine, friend), code: raw.toUpperCase() });
  }

  // Bağlantıyla gelince: kayıtlar yüklenip kendi profilin hazır olduğunda bir kez karşılaştır
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !linkCode || !mine) return;
    autoRan.current = true;
    find(input);
  });

  async function shareResult() {
    if (sharing) return;
    setSharing(true);
    if ((await shareViewSafely(cardRef, 'palateCard')) === 'error') Alert.alert(tr.result.shareError);
    setSharing(false);
  }

  const cardW = Math.min(width - layout.screenPad * 2, 420);
  const cardH = (cardW * 16) / 9;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + layout.topPad, paddingHorizontal: layout.screenPad, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <BackSpacer />
      <Text accessibilityRole="header" style={styles.title}>{tr.match.title}</Text>
      <Text style={styles.sub}>{tr.match.sub}</Text>

      <View style={styles.box}>
        <Text style={styles.label}>{tr.match.myCode}</Text>
        {myCode ? (
          <>
            {/* QR: telefonun kendi kamerasıyla okutulunca Cupped açılır ve uyum hemen hesaplanır */}
            <View style={styles.qrWrap}>
              <QRCode value={`cupped://match?code=${myCode}`} size={176} />
            </View>
            <Text style={styles.code} selectable>
              {myCode}
            </Text>
            <Text style={styles.codeNote}>{tr.match.qrHint}</Text>
            <Text style={styles.codeNote}>{tr.match.codeNote}</Text>
            <PillButton
              label={tr.match.shareCode}
              glass
              variant="light"
              icon="share-outline"
              onPress={() => Share.share({ message: tr.match.shareMessage(myCode) }).catch(() => {})}
              style={{ marginTop: 12, height: 46 }}
            />
          </>
        ) : (
          <Text style={styles.muted}>{tr.match.noCode}</Text>
        )}
      </View>

      {myCode ? (
        <View style={styles.box}>
          <Text style={styles.label}>{tr.match.friendCode}</Text>
          <TextInput
            maxFontSizeMultiplier={1.3}
            value={input}
            // Arkadaşın gönderdiği mesajın tamamı yapıştırılırsa içindeki kod ayıklanır
            onChangeText={(t) => {
              setErr(null);
              setInput((t.length > 8 ? (extractCode(t) ?? t) : t).replace(/[İı]/g, '1').toUpperCase().slice(0, 7));
            }}
            accessibilityLabel={tr.match.friendCode}
            placeholder={tr.match.placeholder}
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => find()}
            style={[styles.input, err ? { borderColor: colors.danger } : null]}
          />
          {err ? (
            <Text style={styles.err} accessibilityLiveRegion="polite" accessibilityRole="alert">
              {err}
            </Text>
          ) : null}
          <PillButton label={tr.match.find} onPress={() => find()} disabled={input.replace(/[\s-]/g, '').length < 6} style={{ marginTop: 12, height: 46 }} />
          {Platform.OS !== 'web' ? (
            <PillButton label={tr.match.scan} icon="qr-code-outline" variant="light" onPress={openScanner} style={{ marginTop: 10, height: 46 }} />
          ) : null}
        </View>
      ) : null}

      {result && mine ? (
        <>
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <View style={{ borderRadius: 24, overflow: 'hidden' }}>
              <ResultCard ref={cardRef} width={cardW} height={cardH} mine={mine} friend={result.friend} match={result.match} myCode={myCode!} />
            </View>
          </View>
          <PillButton glass label={tr.match.shareResult} onPress={shareResult} disabled={sharing} style={{ marginTop: 16 }} />
        </>
      ) : null}
    </ScrollView>
    <FloatingBack label={tr.profile.title} />
    {scanning ? (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(e) => onScanned(e.data)}
        />
        <View style={[styles.scanTop, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.scanTitle}>{tr.match.scanTitle}</Text>
        </View>
        <View style={styles.scanFrame} pointerEvents="none" />
        <View style={[styles.scanBottom, { paddingBottom: insets.bottom + 24 }]}>
          <PillButton label={tr.match.scanClose} variant="light" onPress={() => setScanning(false)} style={{ height: 46, minWidth: 160 }} />
        </View>
      </View>
    ) : null}
    </View>
  );
}

/** Paylaşılan 9:16 sonuç kartı: benim tipimin renginde. */
function ResultCard({
  ref,
  width,
  height,
  mine,
  friend,
  match,
  myCode,
}: {
  ref: React.Ref<CardHandle>;
  width: number;
  height: number;
  mine: TasteProfile;
  friend: TasteProfile;
  match: Match;
  myCode: string;
}) {
  const th = cardTheme(mine.typeId);
  const u = width / 100;
  const a = getPalateType(mine.typeId);
  const b = getPalateType(friend.typeId);
  const common =
    match.common?.kind === 'note'
      ? tr.notes[match.common.note]
      : match.common?.kind === 'method'
        ? tr.methods[match.common.method]
        : match.common?.kind === 'type'
          ? tr.match.sameType
          : tr.match.commonNone;
  return (
    <View ref={ref} collapsable={false} style={{ width, height, backgroundColor: th.bg, padding: u * 8, justifyContent: 'space-between' }}>
      <View>
        <T style={{ color: th.accent, fontSize: u * 3.4, fontWeight: '800', letterSpacing: 1.6 }}>{upper(tr.match.kicker)}</T>
        <T style={{ color: th.fg, fontSize: u * 26, fontFamily: fonts.heavy, marginTop: u * 4 }}>%{match.pct}</T>
        <T style={{ color: th.fg, fontSize: u * 6, fontFamily: fonts.display }}>{tr.match.verdict(match.pct)}</T>
        <T style={{ color: th.muted, fontSize: u * 4, marginTop: u * 3 }}>
          {a.name} × {b.name}
        </T>
      </View>
      <View>
        <Row u={u} th={th} k={tr.match.common} v={common} />
        <Row u={u} th={th} k={tr.match.clash} v={match.clash ? tr.match.clashes[match.clash] : tr.match.clashNone} />
        <Row u={u} th={th} k={tr.match.idea} v={tr.match.ideas[match.idea]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <T style={{ color: th.muted, fontSize: u * 3.3, fontWeight: '600' }}>{tr.match.footer}</T>
          <T style={{ color: th.fg, fontSize: u * 3.6, fontWeight: '700', marginTop: 2 }}>{tr.match.cardCode(myCode)}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Bean size={u * 5} color={th.accent} line={th.bg} />
          <T style={{ color: th.fg, fontSize: u * 5.6, fontFamily: fonts.heavy }}>{BRAND.name}</T>
        </View>
      </View>
    </View>
  );
}

function Row({ u, th, k, v }: { u: number; th: CardTheme; k: string; v: string }) {
  return (
    <View style={{ marginTop: u * 5 }}>
      <T style={{ color: th.muted, fontSize: u * 3.4, fontWeight: '700', letterSpacing: 1 }}>{upper(k)}</T>
      <T style={{ color: th.fg, fontSize: u * 5.4, fontFamily: fonts.display, marginTop: 2 }}>{v}</T>
    </View>
  );
}

/** Kaydedilen görselde yazı boyutu telefonun yazı ayarından etkilenmesin. */
function T(props: TextProps) {
  return <Text allowFontScaling={false} {...props} />;
}

const styles = StyleSheet.create({
  title: { ...type.largeTitle, marginTop: 6 },
  sub: { ...type.subhead, marginTop: 6, lineHeight: 21 },
  box: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginTop: 18 },
  label: { ...type.footnote, fontWeight: '600' },
  err: { ...type.footnote, color: colors.danger, marginTop: 6, fontWeight: '600' },
  codeNote: { ...type.footnote, marginTop: 6 },
  qrWrap: { alignSelf: 'center', padding: 10, borderRadius: 16, backgroundColor: '#FFFFFF', marginTop: 10 },
  scanTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 24, alignItems: 'center' },
  scanTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  scanFrame: { position: 'absolute', top: '30%', alignSelf: 'center', width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: '#FFFFFF' },
  scanBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  code: { fontSize: 40, fontFamily: fonts.heavy, color: colors.text, marginTop: 6, paddingRight: 6 },
  muted: { ...type.subhead, marginTop: 6 },
  input: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.text,
    marginTop: 8,
  },
});
