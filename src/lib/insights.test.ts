import { describe, expect, it } from 'vitest';
import { insights } from './insights';
import type { CupEntry } from './types';

let n = 0;
const cup = (d: number, h: number, p: Partial<CupEntry> = {}): CupEntry => {
  n++;
  return {
    id: String(n),
    createdAt: new Date(2026, 10, d, h).toISOString(),
    photoUri: null,
    method: 'filter',
    placeName: null,
    venueKind: 'home',
    notes: [],
    origin: null,
    score: 60,
    parts: { base: 40, effort: 20, depth: 0, discovery: 0, selectivity: 0 },
    palateTypeId: 'pourover_philosopher',
    ...p,
  };
};
const SAT = new Date(2026, 10, 21, 18);

describe('öne çıkanlar', () => {
  it('veri azken boş', () => {
    expect(insights([], SAT)).toEqual([]);
  });

  it('haftalık trend, kahve saati, favori mekan, kafein', () => {
    const e = [
      cup(10, 9, { score: 50 }),
      cup(11, 9, { score: 54 }),
      cup(18, 8, { score: 60, venueKind: 'independent', placeName: 'Kör Nokta' }),
      cup(19, 9, { score: 62, venueKind: 'independent', placeName: 'kör nokta ' }),
      cup(20, 10, { score: 58, method: 'espresso' }),
    ];
    const ids = Object.fromEntries(insights(e, SAT).map((i) => [i.id, i.text]));
    expect(ids.trend).toBe('Bu hafta ortalaman geçen haftadan 8 puan yüksek.');
    expect(ids.time).toBe('En çok sabahları içiyorsun.');
    expect(ids.place).toBe('Kör Nokta: 2 ziyaret.');
    expect(ids.caffeine).toBe('Bu hafta günde ortalama ~51 mg.'); // (120+120+63)/6 gün = 50,5
  });
});
