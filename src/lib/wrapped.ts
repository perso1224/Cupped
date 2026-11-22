import { CUP_VOLUME_ML, WRAPPED_RULES } from '../config/scoring.config';
import { computePalateTypeId, mostCommon } from './palate';
import { discoveriesIn, inRange } from './progress';
import { levelFor, normalizePlace } from './scoring';
import type { CupEntry, Method } from './types';

/** Damak Özeti (Spotify Wrapped tarzı) hikayesinin slaytları. Sadece veri; görünüm ekranda. */
export type WrappedSlide =
  | { kind: 'intro' }
  | { kind: 'cups'; cups: number; ml: number }
  | { kind: 'method'; method: Method; count: number; pct: number }
  | { kind: 'place'; name: string; visits: number }
  | { kind: 'home'; count: number; pct: number }
  | { kind: 'discover'; places: number; methods: number }
  | { kind: 'best'; entry: CupEntry }
  | { kind: 'score'; avg: number; level: string }
  | { kind: 'type'; typeId: string }
  | {
      kind: 'summary';
      typeId: string;
      method: Method;
      place: string | null;
      cups: number;
      avg: number;
      best: number;
    };

function topBy<T>(items: T[], key: (t: T) => string): { item: T; count: number } | null {
  const counts = new Map<string, { item: T; count: number }>();
  for (const it of items) {
    const k = key(it);
    const cur = counts.get(k);
    if (cur) cur.count++;
    else counts.set(k, { item: it, count: 1 });
  }
  let best: { item: T; count: number } | null = null;
  for (const v of counts.values()) if (!best || v.count > best.count) best = v;
  return best;
}

export function buildWrapped(entries: CupEntry[], start: Date, end: Date): WrappedSlide[] {
  const list = entries
    .filter((e) => inRange(e, start, end))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (list.length === 0) return [];

  const cups = list.length;
  const ml = list.reduce((s, e) => s + CUP_VOLUME_ML[e.method], 0);
  // En sık yöntem: damak tipiyle aynı eşitlik kuralı (eşitlikte en son içilen)
  const topMethod = mostCommon(list.map((e) => e.method))[0];
  const method = { item: { method: topMethod }, count: list.filter((e) => e.method === topMethod).length };
  const outside = list.filter((e) => e.placeName && (e.venueKind === 'chain' || e.venueKind === 'independent'));
  const place = topBy(outside, (e) => normalizePlace(e.placeName!));
  const homeCount = list.filter((e) => e.venueKind === 'home').length;
  const disc = discoveriesIn(entries, start, end);
  const best = list.reduce((b, e) => (e.score > b.score ? e : b));
  const avg = Math.round(list.reduce((s, e) => s + e.score, 0) / cups);
  const typeId = computePalateTypeId(list, { wholePeriod: true });

  const slides: WrappedSlide[] = [
    { kind: 'intro' },
    { kind: 'cups', cups, ml },
    { kind: 'method', method: method.item.method, count: method.count, pct: Math.round((method.count / cups) * 100) },
  ];
  if (homeCount / cups >= WRAPPED_RULES.homeShare) {
    slides.push({ kind: 'home', count: homeCount, pct: Math.round((homeCount / cups) * 100) });
  } else if (place) {
    slides.push({ kind: 'place', name: place.item.placeName!, visits: place.count });
  }
  // Keşif yoksa (0 yeni mekan, 0 yeni yöntem) slayt hiç gösterilmez.
  if (disc.places.length + disc.methods.length > 0) {
    slides.push({ kind: 'discover', places: disc.places.length, methods: disc.methods.length });
  }
  slides.push(
    { kind: 'best', entry: best },
    { kind: 'score', avg, level: levelFor(avg) },
    { kind: 'type', typeId },
    {
      kind: 'summary',
      typeId,
      method: method.item.method,
      place: place ? place.item.placeName! : null,
      cups,
      avg,
      best: best.score,
    },
  );
  return slides;
}
