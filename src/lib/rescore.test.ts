import { describe, expect, it } from 'vitest';
import { rescoreAfter } from './rescore';
import { computePalateTypeId } from './palate';
import { scoreCup } from './scoring';
import type { CupEntry, Method, VenueKind } from './types';

const at = (d: number) => new Date(2026, 10, d, 9).toISOString();
const cup = (id: string, d: number, place: string, discovery: number): CupEntry => ({
  id,
  createdAt: at(d),
  photoUri: null,
  method: 'filter',
  placeName: place,
  venueKind: 'independent',
  notes: [],
  origin: null,
  score: 40 + 15 + discovery,
  parts: { base: 40, effort: 15, depth: 0, discovery, selectivity: 0 },
  palateTypeId: 'third_wave_nomad',
});

describe('silme/düzenleme sonrası yeniden puanlama', () => {
  it('ilk ziyaret silinince sonraki ziyaret yeni mekan puanını alır', () => {
    const first = cup('A', 1, 'Kör Nokta', 25); // yeni mekan + yeni yöntem
    const second = cup('B', 3, 'Kör Nokta', 0);
    const afterDelete = rescoreAfter([second], first.createdAt);
    expect(afterDelete[0].parts.discovery).toBe(25);
    expect(afterDelete[0].score).toBe(80);
  });
  it('değişiklik yoksa aynı liste döner, öncekilere dokunulmaz', () => {
    const l = [cup('B', 3, 'Kör Nokta', 0), cup('A', 1, 'Kör Nokta', 25)];
    expect(rescoreAfter(l, at(2))).toBe(l);
  });
});

// Eski (yavaş) yöntem: her fincan için tüm geçmişi baştan puanlar. Yeni tek geçişli yöntemle aynı sonucu vermeli.

function referenceRescore(list: CupEntry[], fromIso: string): CupEntry[] {
  const chrono = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const updated = new Map<string, CupEntry>();
  const done: CupEntry[] = [];
  for (const e of chrono) {
    if (e.createdAt > fromIso) {
      const r = scoreCup(e, done, e.createdAt);
      const parts = { ...e.parts, discovery: r.parts.discovery };
      const total = Math.max(0, Math.min(100, parts.base + parts.effort + parts.depth + parts.discovery + parts.selectivity));
      const next = { ...e, parts, score: total, palateTypeId: computePalateTypeId([...done, e]) };
      updated.set(e.id, next);
      done.push(next);
      continue;
    }
    done.push(e);
  }
  return list.map((e) => updated.get(e.id) ?? e);
}

function randomHistory(n: number, seed: number): CupEntry[] {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const methods: Method[] = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'];
  const places = ['Kör Nokta', 'Petra', 'Starbucks Moda', 'Starbucks Kadıköy', 'Kronotrop', 'Mandabatmaz', 'Кофе', null];
  const out: CupEntry[] = [];
  let t = Date.UTC(2026, 0, 1);
  for (let i = 0; i < n; i++) {
    t += Math.floor(rnd() * 3 * 86400000) + 60000;
    const place = places[Math.floor(rnd() * places.length)];
    const venueKind: VenueKind = !place ? (rnd() < 0.5 ? 'home' : 'office') : place.startsWith('Starbucks') ? 'chain' : 'independent';
    out.push({
      id: `c${i}`,
      createdAt: new Date(t).toISOString(),
      photoUri: null,
      method: methods[Math.floor(rnd() * methods.length)],
      placeName: place,
      venueKind,
      notes: rnd() < 0.3 ? (['fruity', 'bright'] as CupEntry['notes']) : [],
      origin: null,
      score: 50,
      parts: { base: 40, effort: 10, depth: 0, discovery: 0, selectivity: 0 },
      palateTypeId: 'third_wave_nomad',
    });
  }
  return out;
}

describe('tek geçişli yeniden puanlama', () => {
  it('eski yöntemle birebir aynı sonucu verir', () => {
    for (const seed of [1, 7, 42, 99]) {
      const list = randomHistory(120, seed);
      const from = list[10].createdAt;
      const fast = rescoreAfter(list, from);
      const slow = referenceRescore(list, from);
      expect(fast.map((e) => [e.id, e.parts.discovery, e.score, e.palateTypeId])).toEqual(
        slow.map((e) => [e.id, e.parts.discovery, e.score, e.palateTypeId]),
      );
    }
  });
  it('3000 fincanda bir saniyenin altında biter', () => {
    const list = randomHistory(3000, 5);
    const t0 = Date.now();
    rescoreAfter(list, list[0].createdAt);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
