import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  PanResponder,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { PressScale, haptic, reduceMotionNow, useScreenReader } from '../components/motion';
import { Icon } from '../components/Icon';
import { GLASS, GlassSurface } from '../components/Glass';
import { CloseButton } from '../components/NavButtons';
import { placeLabel, type CardHandle } from '../components/ShareCard';
import { BRAND } from '../config/brand';
import { useDamakCode } from '../lib/useDamakCode';
import { periodWord, tr, upper, type PeriodWord } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { addDays, dayKey, periodRange } from '../lib/progress';
import { shareViewSafely } from '../lib/share';
import { photoUrl } from '../lib/storage';
import { useEntries } from '../lib/useEntries';
import { buildWrapped, type WrappedSlide } from '../lib/wrapped';
import { fonts } from '../theme';

const SLIDE_MS = 5500;

type Theme = { bg: string; fg: string; accent: string };
const AMBER: Theme = { bg: '#D98B2B', fg: '#111111', accent: '#2B1A12' }; // koyu vurgu: amber üstünde okunur
const BLACK: Theme = { bg: '#111111', fg: '#FAF8F5', accent: '#D98B2B' };
const LATTE: Theme = { bg: '#F1E3CF', fg: '#2B1A12', accent: '#B5402F' };
const ESPRESSO: Theme = { bg: '#2B1A12', fg: '#F1E3CF', accent: '#D98B2B' };
const CHERRY: Theme = { bg: '#B5402F', fg: '#FAF8F5', accent: '#F1E3CF' };

const THEME_BY_KIND: Record<WrappedSlide['kind'], Theme> = {
  intro: BLACK,
  cups: AMBER,
  method: LATTE,
  place: ESPRESSO,
  home: ESPRESSO,
  discover: CHERRY,
  best: BLACK,
  score: LATTE,
  type: AMBER,
  summary: BLACK,
};

function capitalize(s: string) {
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function Wrapped() {
  const damakCode = useDamakCode();
  const { period, offset: offsetParam } = useLocalSearchParams<{ period?: string; offset?: string }>();
  const kind = period === 'week' ? 'week' : 'month';
  const offset = offsetParam === '-1' ? -1 : 0;
  const pw = periodWord(kind, offset);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const entries = useEntries();

  const now = new Date();
  const { start, end } = periodRange(kind, offset, now);
  const periodLabel =
    kind === 'week'
      ? `${start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${addDays(end, -1).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`
      : capitalize(start.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }));

  // Gün değişince (gece yarısı) dönem yeniden hesaplansın diye anahtar gün; aralık bu anahtardan türetilir.
  const startKey = dayKey(start);
  const slides = useMemo(() => {
    if (!entries) return [];
    const s = new Date(`${startKey}T00:00:00`);
    return buildWrapped(entries, s, periodRange(kind, 0, s).end);
  }, [entries, startKey, kind]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const holdPaused = useRef(false);
  const [progress] = useState(() => new Animated.Value(0));
  const progressValue = useRef(0);
  const [enter] = useState(() => new Animated.Value(0));
  const slideRef = useRef<CardHandle>(null);
  const [finished, setFinished] = useState(false);
  const [dragY] = useState(() => new Animated.Value(0));

  // Aşağı kaydırınca kapat (Instagram hikayeleri gibi).
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1.2) close();
        else Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  // Slayt alanı: tam 9:16, ekrana sığan en büyük boyut.
  const availH = height - insets.top - insets.bottom - 96;
  const W = Math.min(width, (availH * 9) / 16);
  const H = (W * 16) / 9;

  // Giriş animasyonu
  useEffect(() => {
    if (reduceMotionNow()) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [index, slides.length, enter]);

  // Otomatik ilerleme (goRef: aşağıdaki `go`nun güncel hali)
  const goRef = useRef<(i: number) => void>(() => {});
  // Ekran okuyucu açıkken slaytlar kendiliğinden geçmez (okumaya yetişilmez); kullanıcı ilerletir
  const sr = useScreenReader();
  const stopped = paused || sr;
  useEffect(() => {
    if (!slides.length || stopped) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      // Hareketi azalt açıksa slaytlar daha yavaş ilerler (okumaya zaman kalsın)
      duration: (reduceMotionNow() ? SLIDE_MS * 1.8 : SLIDE_MS) * (1 - progressValue.current),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished: done }) => {
      if (!done) return;
      if (index < slides.length - 1) goRef.current(index + 1);
      else setFinished(true); // son slayt: otomatik kapanmaz ki paylaşılabilsin
    });
    return () => {
      anim.stop();
      progress.stopAnimation((v) => (progressValue.current = v));
    };
    // `go` her render'da yeniden oluşur; zamanlayıcı yalnızca slayt/duraklatma değişince yeniden başlasın diye ref ile çağrılır.
  }, [index, stopped, slides.length, progress]);

  function go(i: number) {
    if (i !== index && i >= 0 && i < slides.length) haptic.select();
    progressValue.current = 0;
    progress.setValue(0);
    const next = Math.max(0, Math.min(slides.length - 1, i));
    setIndex(next);
    // Ekran okuyucuya hangi slaytta olunduğunu söyle
    if (next !== index) AccessibilityInfo.announceForAccessibility(tr.wrapped.slideOf(next + 1, slides.length));
  }

  // Otomatik ilerleme her zaman güncel `go`yu çağırsın
  useEffect(() => {
    goRef.current = go;
  });

  function onTap(e: GestureResponderEvent) {
    if (e.nativeEvent.locationX < W * 0.3) go(index - 1);
    else if (index < slides.length - 1) go(index + 1);
    else close(); // son slayta dokununca çık
  }

  const sharingRef = useRef(false);
  async function share() {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setPaused(true);
    // Giriş animasyonu yarıdaysa bitir; bir kare bekle ki görsel tam yakalansın.
    enter.stopAnimation();
    enter.setValue(1);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    if ((await shareViewSafely(slideRef, 'wrapped')) === 'error') Alert.alert(tr.result.shareError);
    sharingRef.current = false;
    setPaused(false);
  }

  if (entries && slides.length === 0) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', padding: 32 }]}>
        <Text style={styles.empty}>{tr.wrapped.empty}</Text>
        <Pressable onPress={close} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>{tr.result.done}</Text>
        </Pressable>
      </View>
    );
  }
  if (!slides.length) return <View style={styles.screen} />;

  const slide = slides[index];
  const theme = THEME_BY_KIND[slide.kind];
  const isLast = index === slides.length - 1;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]} {...pan.panHandlers}>
      <StatusBar style="light" />
      <Animated.View
        style={{
          width: W,
          height: H,
          alignSelf: 'center',
          borderRadius: 18,
          overflow: 'hidden',
          transform: [{ translateY: dragY }, { scale: dragY.interpolate({ inputRange: [0, 400], outputRange: [1, 0.85], extrapolate: 'clamp' }) }],
        }}
      >
        {/* Sadece bu görünüm kaydedilir (köşeler kare, 9:16). */}
        <View ref={slideRef} collapsable={false} style={{ width: W, height: H, backgroundColor: theme.bg }}>
          <SlideView slide={slide} theme={theme} W={W} H={H} enter={enter} periodLabel={periodLabel} kind={kind} index={index} pw={pw} code={damakCode} />
        </View>

        {/* Dokunma alanı. Ekran okuyucuda ayarlanabilir öğe: yukarı/aşağı kaydırarak slayt değişir */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onTap}
          onLongPress={() => {
            // Basılı tutunca durur, bırakınca devam eder (durdur düğmesiyle durdurulduysa bırakınca devam etmez)
            if (paused) return;
            holdPaused.current = true;
            setPaused(true);
          }}
          onPressOut={() => {
            if (!holdPaused.current) return;
            holdPaused.current = false;
            setPaused(false);
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={tr.wrapped.slideOf(index + 1, slides.length)}
          accessibilityHint={tr.wrapped.a11yHint}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'increment') go(index + 1);
            else if (e.nativeEvent.actionName === 'decrement') go(index - 1);
          }}
        />

        {/* İlerleme çubukları + kapat (kaydedilmez) */}
        <View style={styles.bars} pointerEvents="none">
          {slides.map((_, i) => (
            <View key={i} style={[styles.bar, { backgroundColor: hexA(theme.fg, 0.25) }]}>
              <Animated.View
                style={{
                  height: 3,
                  backgroundColor: theme.fg,
                  width:
                    i < index
                      ? '100%'
                      : i > index
                        ? '0%'
                        : progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }}
              />
            </View>
          ))}
        </View>
        {/* Instagram hikayeleri gibi sağ üstte; yanında durdur/oynat (otomatik ilerleme durdurulabilsin) */}
        <View style={[styles.close, { flexDirection: 'row', gap: 10 }]}>
          {!sr ? (
            <PressScale
              onPress={() => {
                holdPaused.current = false;
                setPaused((p) => !p);
              }}
              hitSlop={10}
              scaleTo={0.9}
              style={[styles.pauseBtn, { backgroundColor: theme.bg !== '#F1E3CF' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)' }]}
              accessibilityRole="button"
              accessibilityLabel={paused ? tr.wrapped.play : tr.wrapped.pause}
            >
              <Icon name={paused ? 'play' : 'pause'} size={18} color={theme.fg} />
            </PressScale>
          ) : null}
          <CloseButton onPress={close} tint={theme.fg} dark={theme.bg !== '#F1E3CF'} />
        </View>
      </Animated.View>

      {index === 0 && !sr ? (
        <Text style={styles.hint} pointerEvents="none">
          {tr.wrapped.tapHint}
        </Text>
      ) : null}
      {/* Ekran okuyucu: önceki/sonraki kendi satırında (küçük ekranda paylaş düğmesiyle yan yana sığmıyordu) */}
      {sr ? (
        <View style={styles.navRow}>
          <PressScale onPress={() => go(index - 1)} scaleTo={0.95} style={styles.navBtn} accessibilityRole="button" accessibilityLabel={tr.wrapped.prev} disabled={index === 0}>
            <Icon name="chevron-back" size={22} color="#FAF8F5" />
          </PressScale>
          <Text style={styles.navText}>{tr.wrapped.slideOf(index + 1, slides.length)}</Text>
          <PressScale onPress={() => go(index + 1)} scaleTo={0.95} style={styles.navBtn} accessibilityRole="button" accessibilityLabel={tr.wrapped.next} disabled={isLast}>
            <Icon name="chevron-forward" size={22} color="#FAF8F5" />
          </PressScale>
        </View>
      ) : null}
      <View style={styles.bottomRow}>
        {/* Kapatmak için sağ üstte ✕ var; altta yalnızca son slaytta "Bitti" */}
        {isLast && finished ? (
          <PressScale onPress={close} scaleTo={0.95} style={[styles.closeBtn, styles.finishBtn]}>
            <Text style={[styles.closeBtnText, { color: '#111' }]}>{tr.wrapped.finish}</Text>
          </PressScale>
        ) : null}
        {/* iPhone iOS 26+: Liquid Glass kapsül (yazı slayt renginde); diğerlerinde açık renk kapsül */}
        <PressScale onPress={share} scaleTo={0.95} style={[styles.shareBtn, { flexShrink: 1 }, GLASS && styles.shareClear]}>
          {GLASS ? <GlassSurface style={styles.glassFill} interactive /> : null}
          <Text style={[styles.shareText, GLASS && { color: theme.fg }]} numberOfLines={1}>
            {tr.wrapped.share}
          </Text>
        </PressScale>
      </View>
    </View>
  );
}

/** Türkçe büyük harfli başlık (textTransform:'uppercase' "İ"yi bozar). */
function Kicker({ style, children }: { style: React.ComponentProps<typeof Animated.Text>['style']; children: React.ReactNode }) {
  const up = (c: React.ReactNode): React.ReactNode => (typeof c === 'string' ? upper(c) : Array.isArray(c) ? c.map(up) : c);
  return (
    <Animated.Text allowFontScaling={false} style={style}>
      {up(children)}
    </Animated.Text>
  );
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Fincan izi motifi: iç içe halkalar. */
function Rings({ color, size, style }: { color: string; size: number; style: object }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} style={[{ position: 'absolute' }, style]}>
      {[0.48, 0.38, 0.28].map((r, i) => (
        <Circle key={i} cx={c} cy={c} r={size * r} stroke={color} strokeWidth={size * 0.03} fill="none" opacity={0.35 - i * 0.08} />
      ))}
    </Svg>
  );
}

function SlideView({
  slide,
  theme,
  W,
  H,
  enter,
  periodLabel,
  kind,
  index,
  pw,
  code,
}: {
  code: string | null;
  slide: WrappedSlide;
  theme: Theme;
  W: number;
  H: number;
  enter: Animated.Value;
  periodLabel: string;
  kind: 'week' | 'month';
  index: number;
  pw: PeriodWord;
}) {
  const u = W / 100; // 1 birim = genişliğin %1'i
  const rise = (delay: number) => ({
    opacity: enter.interpolate({ inputRange: [0, delay, 1], outputRange: [0, 0, 1] }),
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [u * 8, 0] }) }],
  });
  const pop = {
    opacity: enter,
    transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
  };
  const t = { color: theme.fg };
  const a = { color: theme.accent };
  const ringSize = W * 1.1;
  const ringPos = [
    { top: -ringSize * 0.35, right: -ringSize * 0.35 },
    { bottom: -ringSize * 0.3, left: -ringSize * 0.4 },
    { top: H * 0.25, right: -ringSize * 0.55 },
  ][index % 3];

  const footer = (
    <View style={[styles.footer, { paddingHorizontal: u * 7, paddingBottom: H * 0.16 }]}>
      <Text allowFontScaling={false} style={[styles.footerBrand, t, { fontSize: u * 5.5 }]}>{BRAND.name}</Text>
      <Text allowFontScaling={false} style={[styles.footerQ, { color: hexA(theme.fg, 0.7), fontSize: u * 3.4, textAlign: 'right' }]}>
        {tr.card.question}
        {code ? `\n${tr.match.cardCode(code)}` : ''}
      </Text>
    </View>
  );

  const pad = { paddingHorizontal: u * 7, paddingTop: u * 16 };

  let body: React.ReactNode = null;
  switch (slide.kind) {
    case 'intro':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Kicker style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>
            {kind === 'week' ? tr.wrapped.weekTitle : tr.wrapped.monthTitle}
          </Kicker>
          <Animated.Text allowFontScaling={false} style={[styles.huge, t, { fontSize: u * 15, lineHeight: u * 16 }, rise(0.15)]}>{periodLabel}</Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.sub, t, { fontSize: u * 5, marginTop: u * 4 }, rise(0.35)]}>{tr.wrapped.introSub}</Animated.Text>
        </View>
      );
      break;
    case 'cups':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text allowFontScaling={false} style={[styles.sub, t, { fontSize: u * 6 }, rise(0)]}>{tr.wrapped.cupsTitle(pw)}</Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.mega, t, { fontSize: u * 48, lineHeight: u * 50 }, pop]}>{slide.cups}</Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.huge, t, { fontSize: u * 11 }, rise(0.2)]}>{tr.wrapped.cupsUnit}</Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.sub, a, { fontSize: u * 5.5, marginTop: u * 4 }, rise(0.45)]}>{tr.wrapped.cupsFact(slide.ml)}</Animated.Text>
        </View>
      );
      break;
    case 'method':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Kicker style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>{tr.wrapped.methodTitle}</Kicker>
          <Animated.Text allowFontScaling={false} style={[styles.huge, t, { fontSize: u * 17, lineHeight: u * 18 }, pop]} adjustsFontSizeToFit numberOfLines={2}>
            {tr.methods[slide.method]}
          </Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.sub, t, { fontSize: u * 5.5, marginTop: u * 4 }, rise(0.35)]}>
            {tr.wrapped.methodFact(slide.count, slide.pct)}
          </Animated.Text>
        </View>
      );
      break;
    case 'place':
    case 'home':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Kicker style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>
            {slide.kind === 'place' ? tr.wrapped.placeTitle : tr.wrapped.homeTitle}
          </Kicker>
          <Animated.Text allowFontScaling={false} style={[styles.huge, t, { fontSize: u * 15, lineHeight: u * 16 }, pop]} adjustsFontSizeToFit numberOfLines={3}>
            {slide.kind === 'place' ? slide.name : tr.card.homeBrew}
          </Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.sub, t, { fontSize: u * 5.5, marginTop: u * 4 }, rise(0.35)]}>
            {slide.kind === 'place' ? tr.wrapped.placeFact(slide.visits) : tr.wrapped.homeFact(slide.pct)}
          </Animated.Text>
        </View>
      );
      break;
    case 'discover':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Kicker style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>{tr.wrapped.discoverTitle}</Kicker>
          {slide.places + slide.methods === 0 ? (
            <Animated.Text allowFontScaling={false} style={[styles.huge, t, { fontSize: u * 9, lineHeight: u * 11 }, rise(0.15)]}>{tr.wrapped.discoverNone}</Animated.Text>
          ) : (
            <>
              {slide.places > 0 ? (
              <Animated.View style={[styles.row, pop]}>
                <Text allowFontScaling={false} style={[styles.mega, t, { fontSize: u * 30, lineHeight: u * 32 }]}>{slide.places}</Text>
                <Text allowFontScaling={false} style={[styles.sub, t, { fontSize: u * 6.5, marginLeft: u * 3 }]}>{tr.wrapped.discoverPlaces}</Text>
              </Animated.View>
              ) : null}
              {slide.methods > 0 ? (
              <Animated.View style={[styles.row, rise(0.3)]}>
                <Text allowFontScaling={false} style={[styles.mega, t, { fontSize: u * 30, lineHeight: u * 32 }]}>{slide.methods}</Text>
                <Text allowFontScaling={false} style={[styles.sub, t, { fontSize: u * 6.5, marginLeft: u * 3 }]}>{tr.wrapped.discoverMethods}</Text>
              </Animated.View>
              ) : null}
            </>
          )}
        </View>
      );
      break;
    case 'best':
      body = (
        <View style={{ flex: 1 }}>
          {photoUrl(slide.entry.photoUri) ? (
            <Image source={{ uri: photoUrl(slide.entry.photoUri)! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: H * 0.14 }]}>
              <Icon name="cafe" size={u * 30} color={theme.accent} />
            </View>
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,17,0.35)' }]} />
          <View style={[pad, { flex: 1, justifyContent: 'flex-end', paddingBottom: u * 22 }]}>
            <Kicker style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>{tr.wrapped.bestTitle(pw)}</Kicker>
            <Animated.Text allowFontScaling={false} style={[styles.mega, { color: '#FAF8F5', fontSize: u * 40, lineHeight: u * 42 }, pop]}>{slide.entry.score}</Animated.Text>
            <Animated.Text allowFontScaling={false} style={[styles.sub, { color: '#FAF8F5', fontSize: u * 5.5 }, rise(0.35)]}>
              {tr.methods[slide.entry.method]} · {placeLabel(slide.entry)}
            </Animated.Text>
          </View>
        </View>
      );
      break;
    case 'score':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Kicker style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>{tr.wrapped.scoreTitle}</Kicker>
          <Animated.Text allowFontScaling={false} style={[styles.mega, t, { fontSize: u * 48, lineHeight: u * 50 }, pop]}>{slide.avg}</Animated.Text>
        </View>
      );
      break;
    case 'type': {
      const type = getPalateType(slide.typeId);
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text allowFontScaling={false} style={[styles.sub, t, { fontSize: u * 6 }, rise(0)]}>{tr.wrapped.typeTitle(pw)}</Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.huge, t, { fontSize: u * 17, lineHeight: u * 18, marginTop: u * 3 }, pop]} adjustsFontSizeToFit numberOfLines={3}>
            {type.name}
          </Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.sub, t, { fontSize: u * 5.5, marginTop: u * 4 }, rise(0.45)]}>{type.tagline}</Animated.Text>
        </View>
      );
      break;
    }
    case 'summary': {
      const type = getPalateType(slide.typeId);
      const rows: [string, string][] = [
        [tr.wrapped.summaryMethod, tr.methods[slide.method]],
        ...(slide.place ? ([[tr.wrapped.summaryPlace, slide.place]] as [string, string][]) : []),
      ];
      body = (
        <View style={[pad, { flex: 1, paddingTop: u * 20 }]}>
          <Kicker style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>
            {tr.wrapped.summaryTitle} · {periodLabel}
          </Kicker>
          <Animated.Text allowFontScaling={false} style={[styles.huge, t, { fontSize: u * 12, lineHeight: u * 13, marginTop: u * 3 }, rise(0.1)]} adjustsFontSizeToFit numberOfLines={2}>
            {type.name}
          </Animated.Text>
          <Animated.View style={[styles.statRow, { marginTop: u * 7 }, rise(0.25)]}>
            {[
              [slide.cups, tr.wrapped.summaryCups],
              [slide.avg, tr.wrapped.summaryAvg],
              [slide.best, tr.wrapped.summaryBest],
            ].map(([v, l]) => (
              <View key={String(l)} style={{ flex: 1 }}>
                <Text allowFontScaling={false} style={[styles.mega, a, { fontSize: u * 14, lineHeight: u * 15 }]}>{v}</Text>
                <Text allowFontScaling={false} style={[styles.sub, { color: hexA(theme.fg, 0.7), fontSize: u * 3.8 }]}>{l}</Text>
              </View>
            ))}
          </Animated.View>
          <Animated.View style={[{ marginTop: u * 7 }, rise(0.4)]}>
            {rows.map(([l, v]) => (
              <View key={l} style={{ marginBottom: u * 4 }}>
                <Text allowFontScaling={false} style={[styles.sub, { color: hexA(theme.fg, 0.7), fontSize: u * 3.8 }]}>{l}</Text>
                <Text allowFontScaling={false} style={[styles.huge, t, { fontSize: u * 7.5 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {v}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>
      );
      break;
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {slide.kind !== 'best' ? <Rings color={theme.accent} size={ringSize} style={ringPos} /> : null}
      {body}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  bars: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  close: { position: 'absolute', top: 22, right: 12 },
  hint: { color: '#CFC8BE', fontSize: 12, textAlign: 'center', marginTop: 6 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12, paddingHorizontal: 24 },
  closeBtn: {
    borderRadius: 999,
    paddingHorizontal: 24,
    height: 48,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FAF8F5',
    marginRight: 0,
  },
  finishBtn: { backgroundColor: '#D98B2B', borderColor: '#D98B2B' },
  closeBtnText: { fontSize: 16, fontWeight: '800', color: '#FAF8F5' },
  kicker: { fontWeight: '800', letterSpacing: 1.4, marginBottom: 8 },
  // Diğer kartlarla aynı yazı ailesi (Fraunces)
  huge: { fontFamily: fonts.heavy, letterSpacing: -0.5 },
  mega: { fontFamily: fonts.heavy, letterSpacing: -2 },
  sub: { fontWeight: '600', lineHeight: undefined },
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: { alignSelf: 'flex-start', borderRadius: 999 },
  pillText: { fontWeight: '900' },
  statRow: { flexDirection: 'row' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerBrand: { fontFamily: fonts.heavy },
  footerQ: { fontWeight: '600' },
  shareBtn: {
    backgroundColor: '#FAF8F5',
    borderRadius: 999,
    paddingHorizontal: 28,
    height: 48,
    justifyContent: 'center',
  },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 },
  navText: { color: '#FAF8F5', fontSize: 14, fontWeight: '600' },
  pauseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(250,248,245,0.5)', alignItems: 'center', justifyContent: 'center' },
  shareClear: { backgroundColor: 'transparent' },
  glassFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999 },
  shareText: { fontSize: 16, fontWeight: '800', color: '#111' },
  empty: { color: '#FAF8F5', fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  emptyBtn: { marginTop: 24, alignSelf: 'center', backgroundColor: '#FAF8F5', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { fontWeight: '800', color: '#111' },
});
