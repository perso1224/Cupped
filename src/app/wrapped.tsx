import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import type { CardHandle } from '../components/ShareCard';
import { BRAND } from '../config/brand';
import { tr } from '../i18n/tr';
import { getPalateType } from '../lib/palate';
import { addDays, startOfMonth, startOfWeek } from '../lib/progress';
import { shareViewAsImage } from '../lib/share';
import { useEntries } from '../lib/useEntries';
import { buildWrapped, type WrappedSlide } from '../lib/wrapped';

const SLIDE_MS = 5500;

type Theme = { bg: string; fg: string; accent: string };
const AMBER: Theme = { bg: '#D98B2B', fg: '#111111', accent: '#FAF8F5' };
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

export default function Wrapped() {
  const { period } = useLocalSearchParams<{ period?: string }>();
  const kind = period === 'week' ? 'week' : 'month';
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const entries = useEntries();

  const now = new Date();
  const start = kind === 'week' ? startOfWeek(now) : startOfMonth(now);
  const end = kind === 'week' ? addDays(start, 7) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const periodLabel =
    kind === 'week'
      ? `${start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${addDays(end, -1).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`
      : capitalize(start.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }));

  const slides = useMemo(() => (entries ? buildWrapped(entries, start, end) : []), [entries]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(0);
  const enter = useRef(new Animated.Value(0)).current;
  const slideRef = useRef<CardHandle>(null);

  // Slayt alanı: tam 9:16, ekrana sığan en büyük boyut.
  const availH = height - insets.top - insets.bottom - 64;
  const W = Math.min(width, (availH * 9) / 16);
  const H = (W * 16) / 9;

  // Giriş animasyonu
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [index, slides.length]);

  // Otomatik ilerleme
  useEffect(() => {
    if (!slides.length || paused) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: SLIDE_MS * (1 - progressValue.current),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished && index < slides.length - 1) go(index + 1);
    });
    return () => {
      anim.stop();
      progress.stopAnimation((v) => (progressValue.current = v));
    };
  }, [index, paused, slides.length]);

  function go(i: number) {
    progressValue.current = 0;
    progress.setValue(0);
    setIndex(Math.max(0, Math.min(slides.length - 1, i)));
  }

  function onTap(e: GestureResponderEvent) {
    if (e.nativeEvent.locationX < W * 0.3) go(index - 1);
    else if (index < slides.length - 1) go(index + 1);
  }

  async function share() {
    setPaused(true);
    try {
      await shareViewAsImage(slideRef);
    } catch {
      Alert.alert(tr.result.shareError);
    } finally {
      setPaused(false);
    }
  }

  if (entries && slides.length === 0) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', padding: 32 }]}>
        <Text style={styles.empty}>{tr.wrapped.empty}</Text>
        <Pressable onPress={() => router.back()} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>{tr.result.done}</Text>
        </Pressable>
      </View>
    );
  }
  if (!slides.length) return <View style={styles.screen} />;

  const slide = slides[index];
  const theme = THEME_BY_KIND[slide.kind];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={{ width: W, height: H, alignSelf: 'center', borderRadius: 18, overflow: 'hidden' }}>
        {/* Sadece bu görünüm kaydedilir (köşeler kare, 9:16). */}
        <View ref={slideRef} collapsable={false} style={{ width: W, height: H, backgroundColor: theme.bg }}>
          <SlideView slide={slide} theme={theme} W={W} H={H} enter={enter} periodLabel={periodLabel} kind={kind} index={index} />
        </View>

        <Pressable style={StyleSheet.absoluteFill} onPress={onTap} onLongPress={() => setPaused(true)} onPressOut={() => paused && setPaused(false)} />

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
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Text style={[styles.closeText, { color: theme.fg }]}>✕</Text>
        </Pressable>
      </View>

      <Pressable onPress={share} style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.8 }]}>
        <Text style={styles.shareText}>{tr.wrapped.share}</Text>
      </Pressable>
    </View>
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
}: {
  slide: WrappedSlide;
  theme: Theme;
  W: number;
  H: number;
  enter: Animated.Value;
  periodLabel: string;
  kind: 'week' | 'month';
  index: number;
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
    <View style={[styles.footer, { paddingHorizontal: u * 7, paddingBottom: u * 6 }]}>
      <Text style={[styles.footerBrand, t, { fontSize: u * 5.5 }]}>{BRAND.name}</Text>
      <Text style={[styles.footerQ, { color: hexA(theme.fg, 0.7), fontSize: u * 3.4 }]}>{tr.card.question}</Text>
    </View>
  );

  const pad = { paddingHorizontal: u * 7, paddingTop: u * 16 };

  let body: React.ReactNode = null;
  switch (slide.kind) {
    case 'intro':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>
            {kind === 'week' ? tr.wrapped.weekTitle : tr.wrapped.monthTitle}
          </Animated.Text>
          <Animated.Text style={[styles.huge, t, { fontSize: u * 15, lineHeight: u * 16 }, rise(0.15)]}>{periodLabel}</Animated.Text>
          <Animated.Text style={[styles.sub, t, { fontSize: u * 5, marginTop: u * 4 }, rise(0.35)]}>{tr.wrapped.introSub}</Animated.Text>
        </View>
      );
      break;
    case 'cups':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text style={[styles.sub, t, { fontSize: u * 6 }, rise(0)]}>{tr.wrapped.cupsTitle}</Animated.Text>
          <Animated.Text style={[styles.mega, t, { fontSize: u * 48, lineHeight: u * 50 }, pop]}>{slide.cups}</Animated.Text>
          <Animated.Text style={[styles.huge, t, { fontSize: u * 11 }, rise(0.2)]}>{tr.wrapped.cupsUnit}</Animated.Text>
          <Animated.Text style={[styles.sub, a, { fontSize: u * 5.5, marginTop: u * 4 }, rise(0.45)]}>{tr.wrapped.cupsFact(slide.ml)}</Animated.Text>
        </View>
      );
      break;
    case 'method':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>{tr.wrapped.methodTitle}</Animated.Text>
          <Animated.Text style={[styles.huge, t, { fontSize: u * 17, lineHeight: u * 18 }, pop]} adjustsFontSizeToFit numberOfLines={2}>
            {tr.methods[slide.method]}
          </Animated.Text>
          <Animated.Text style={[styles.sub, t, { fontSize: u * 5.5, marginTop: u * 4 }, rise(0.35)]}>
            {tr.wrapped.methodFact(slide.count, slide.pct)}
          </Animated.Text>
        </View>
      );
      break;
    case 'place':
    case 'home':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>
            {slide.kind === 'place' ? tr.wrapped.placeTitle : tr.wrapped.homeTitle}
          </Animated.Text>
          <Animated.Text style={[styles.huge, t, { fontSize: u * 15, lineHeight: u * 16 }, pop]} adjustsFontSizeToFit numberOfLines={3}>
            {slide.kind === 'place' ? slide.name : '🏠 ' + tr.card.homeBrew}
          </Animated.Text>
          <Animated.Text style={[styles.sub, t, { fontSize: u * 5.5, marginTop: u * 4 }, rise(0.35)]}>
            {slide.kind === 'place' ? tr.wrapped.placeFact(slide.visits) : tr.wrapped.homeFact(slide.pct)}
          </Animated.Text>
        </View>
      );
      break;
    case 'discover':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>{tr.wrapped.discoverTitle}</Animated.Text>
          {slide.places + slide.methods === 0 ? (
            <Animated.Text style={[styles.huge, t, { fontSize: u * 9, lineHeight: u * 11 }, rise(0.15)]}>{tr.wrapped.discoverNone}</Animated.Text>
          ) : (
            <>
              <Animated.View style={[styles.row, pop]}>
                <Text style={[styles.mega, t, { fontSize: u * 30, lineHeight: u * 32 }]}>{slide.places}</Text>
                <Text style={[styles.sub, t, { fontSize: u * 6.5, marginLeft: u * 3 }]}>{tr.wrapped.discoverPlaces}</Text>
              </Animated.View>
              <Animated.View style={[styles.row, rise(0.3)]}>
                <Text style={[styles.mega, t, { fontSize: u * 30, lineHeight: u * 32 }]}>{slide.methods}</Text>
                <Text style={[styles.sub, t, { fontSize: u * 6.5, marginLeft: u * 3 }]}>{tr.wrapped.discoverMethods}</Text>
              </Animated.View>
            </>
          )}
        </View>
      );
      break;
    case 'best':
      body = (
        <View style={{ flex: 1 }}>
          {slide.entry.photoUri ? (
            <Image source={{ uri: slide.entry.photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: H * 0.14 }]}>
              <Text style={{ fontSize: u * 34 }}>☕</Text>
            </View>
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,17,0.35)' }]} />
          <View style={[pad, { flex: 1, justifyContent: 'flex-end', paddingBottom: u * 22 }]}>
            <Animated.Text style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>{tr.wrapped.bestTitle}</Animated.Text>
            <Animated.Text style={[styles.mega, { color: '#FAF8F5', fontSize: u * 40, lineHeight: u * 42 }, pop]}>{slide.entry.score}</Animated.Text>
            <Animated.Text style={[styles.sub, { color: '#FAF8F5', fontSize: u * 5.5 }, rise(0.35)]}>
              {tr.methods[slide.entry.method]} · {slide.entry.placeName ?? (slide.entry.venueKind === 'home' ? tr.card.homeBrew : tr.card.office)}
            </Animated.Text>
          </View>
        </View>
      );
      break;
    case 'score':
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>{tr.wrapped.scoreTitle}</Animated.Text>
          <Animated.Text style={[styles.mega, t, { fontSize: u * 48, lineHeight: u * 50 }, pop]}>{slide.avg}</Animated.Text>
          <Animated.View style={[styles.pill, { backgroundColor: theme.fg, paddingHorizontal: u * 5, paddingVertical: u * 2 }, rise(0.35)]}>
            <Text style={[styles.pillText, { color: theme.bg, fontSize: u * 5.5 }]}>{slide.level}</Text>
          </Animated.View>
        </View>
      );
      break;
    case 'type': {
      const type = getPalateType(slide.typeId);
      body = (
        <View style={[pad, { flex: 1, justifyContent: 'center' }]}>
          <Animated.Text style={[styles.sub, t, { fontSize: u * 6 }, rise(0)]}>{tr.wrapped.typeTitle}</Animated.Text>
          <Animated.Text style={[styles.huge, t, { fontSize: u * 17, lineHeight: u * 18, marginTop: u * 3 }, pop]} adjustsFontSizeToFit numberOfLines={3}>
            {type.name}
          </Animated.Text>
          <Animated.Text style={[styles.sub, t, { fontSize: u * 5.5, marginTop: u * 4 }, rise(0.45)]}>{type.tagline}</Animated.Text>
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
        <View style={[pad, { flex: 1, paddingTop: u * 14 }]}>
          <Animated.Text style={[styles.kicker, a, { fontSize: u * 4 }, rise(0)]}>
            {tr.wrapped.summaryTitle} · {periodLabel}
          </Animated.Text>
          <Animated.Text style={[styles.huge, t, { fontSize: u * 12, lineHeight: u * 13, marginTop: u * 3 }, rise(0.1)]} adjustsFontSizeToFit numberOfLines={2}>
            {type.name}
          </Animated.Text>
          <Animated.View style={[styles.statRow, { marginTop: u * 7 }, rise(0.25)]}>
            {[
              [slide.cups, tr.wrapped.summaryCups],
              [slide.avg, tr.wrapped.summaryAvg],
              [slide.best, tr.wrapped.summaryBest],
            ].map(([v, l]) => (
              <View key={String(l)} style={{ flex: 1 }}>
                <Text style={[styles.mega, a, { fontSize: u * 14, lineHeight: u * 15 }]}>{v}</Text>
                <Text style={[styles.sub, { color: hexA(theme.fg, 0.7), fontSize: u * 3.8 }]}>{l}</Text>
              </View>
            ))}
          </Animated.View>
          <Animated.View style={[{ marginTop: u * 7 }, rise(0.4)]}>
            {rows.map(([l, v]) => (
              <View key={l} style={{ marginBottom: u * 4 }}>
                <Text style={[styles.sub, { color: hexA(theme.fg, 0.7), fontSize: u * 3.8 }]}>{l}</Text>
                <Text style={[styles.huge, t, { fontSize: u * 7.5 }]} numberOfLines={1} adjustsFontSizeToFit>
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
  bars: { position: 'absolute', top: 12, left: 12, right: 52, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  close: { position: 'absolute', top: 2, right: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, fontWeight: '700' },
  kicker: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 },
  huge: { fontWeight: '900', letterSpacing: -1 },
  mega: { fontWeight: '900', letterSpacing: -4 },
  sub: { fontWeight: '600', lineHeight: undefined },
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: { alignSelf: 'flex-start', borderRadius: 999 },
  pillText: { fontWeight: '900' },
  statRow: { flexDirection: 'row' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerBrand: { fontWeight: '900', letterSpacing: -0.5 },
  footerQ: { fontWeight: '600' },
  shareBtn: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 999,
    paddingHorizontal: 28,
    height: 48,
    justifyContent: 'center',
  },
  shareText: { fontSize: 16, fontWeight: '800', color: '#111' },
  empty: { color: '#FAF8F5', fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  emptyBtn: { marginTop: 24, alignSelf: 'center', backgroundColor: '#FAF8F5', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { fontWeight: '800', color: '#111' },
});
