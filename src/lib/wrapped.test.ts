import { describe, expect, it } from 'vitest';
import { buildWrapped } from './wrapped';
import type { CupEntry } from './types';

let n = 0;
const at = (d: number, h = 9) => new Date(2026, 10, d, h).toISOString();
function cup(createdAt: string, p: Partial<CupEntry> = {}): CupEntry {
  n++;
  return {
    id: String(n),
    createdAt,
    photoUri: null,
    method: 'filter',
    placeName: null,
    venueKind: 'home',
    notes: [],
    origin: null,
    score: 50,
    parts: { base: 30, effort: 20, depth: 0, discovery: 0, selectivity: 0 },
    palateTypeId: 'pourover_philosopher',
    ...p,
  };
}
const NOV = [new Date(2026, 10, 1), new Date(2026, 11, 1)] as const;

describe('Damak Özeti', () => {
  it('fincan yoksa slayt yok', () => {
    expect(buildWrapped([], ...NOV)).toEqual([]);
  });

  it('dışarıda ağırlıklı ay: mekan slaytı, sırayla tüm slaytlar', () => {
    const e = [
      cup(at(2), { method: 'milk', venueKind: 'chain', placeName: 'Starbucks', score: 40 }),
      cup(at(3), { method: 'milk', venueKind: 'chain', placeName: 'starbucks', score: 45 }),
      cup(at(4), { method: 'espresso', venueKind: 'independent', placeName: 'Kör Nokta', score: 80 }),
    ];
    const s = buildWrapped(e, ...NOV);
    expect(s.map((x) => x.kind)).toEqual(['intro', 'cups', 'method', 'place', 'discover', 'best', 'score', 'type', 'summary']);
    expect(s[1]).toEqual({ kind: 'cups', cups: 3, ml: 640 });
    expect(s[2]).toEqual({ kind: 'method', method: 'milk', count: 2, pct: 67 });
    expect(s[3]).toEqual({ kind: 'place', name: 'Starbucks', visits: 2 });
    expect(s[4]).toEqual({ kind: 'discover', places: 2, methods: 2 });
    expect(s[5].kind === 'best' && s[5].entry.score).toBe(80);
    expect(s[6]).toEqual({ kind: 'score', avg: 55, level: 'Çaylak' }); // seviye: biriken kahve puanı (3 fincan)
  });

  it('evde ağırlıklı ay: "evin en iyi kafen" slaytı', () => {
    const e = [cup(at(2)), cup(at(3)), cup(at(4), { venueKind: 'independent', placeName: 'X' })];
    const kinds = buildWrapped(e, ...NOV).map((x) => x.kind);
    expect(kinds).toContain('home');
    expect(kinds).not.toContain('place');
  });

  it('dönem dışındaki fincanlar sayılmaz ama keşif geçmişe göre hesaplanır', () => {
    const e = [
      cup(at(1), { venueKind: 'independent', placeName: 'Eski' }),
      cup(new Date(2026, 9, 20).toISOString(), { venueKind: 'independent', placeName: 'Eski' }),
    ];
    const s = buildWrapped(e, ...NOV);
    expect(s.find((x) => x.kind === 'cups')).toMatchObject({ cups: 1 });
    // 0 yeni mekan ve 0 yeni yöntem: keşif slaytı hiç yok
    expect(s.find((x) => x.kind === 'discover')).toBeUndefined();
  });
});
