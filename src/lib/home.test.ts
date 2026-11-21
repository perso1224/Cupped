import { describe, expect, it } from 'vitest';
import { agoLabel, caffeineToday, dailyNudge, levelProgress, weekPartAverages } from './home';
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
    score: 65,
    parts: { base: 40, effort: 25, depth: 0, discovery: 0, selectivity: 0 },
    palateTypeId: 'pourover_philosopher',
    ...p,
  };
}
const SAT = new Date(2026, 10, 21, 15); // Cumartesi

describe('ana sayfa panoları', () => {
  it('haftalık Emek/Keşif/Derinlik ortalamaları', () => {
    const r = weekPartAverages(
      [
        cup(at(17), { parts: { base: 40, effort: 25, depth: 10, discovery: 10, selectivity: 0 } }),
        cup(at(18), { parts: { base: 40, effort: 15, depth: 0, discovery: 0, selectivity: -5 } }),
        cup(at(10), { parts: { base: 40, effort: 0, depth: 0, discovery: 25, selectivity: 0 } }), // geçen hafta
      ],
      SAT,
    );
    expect(r.cups).toBe(2);
    expect(r.effort).toEqual({ avg: 20, fraction: 0.8 });
    expect(r.discovery.avg).toBe(5);
    expect(r.depth).toEqual({ avg: 5, fraction: 0.5 });
  });

  it('bugünkü kafein ve son kahveden beri geçen süre', () => {
    const r = caffeineToday([cup(at(21, 9), { method: 'espresso' }), cup(at(21, 13), { method: 'milk' }), cup(at(20, 9))], SAT);
    expect(r).toEqual({ mg: 173, cups: 2, minutesSinceLast: 120 });
    expect(caffeineToday([], SAT).minutesSinceLast).toBeNull();
  });

  it('süre etiketi', () => {
    expect(agoLabel(0)).toBe('1 dk');
    expect(agoLabel(35)).toBe('35 dk');
    expect(agoLabel(130)).toBe('2 sa');
    expect(agoLabel(3 * 1440)).toBe('3 gün');
    expect(agoLabel(null)).toBe('—');
  });

  it('seviye ilerlemesi', () => {
    expect(levelProgress([])).toBeNull();
    const p = levelProgress([cup(at(20), { score: 66 }), cup(at(21), { score: 68 })])!;
    expect(p).toMatchObject({ avg: 67, level: 'Seçici', next: 'Uzman', toNext: 8 });
    expect(p.fraction).toBeCloseTo(7 / 15);
    expect(levelProgress([cup(at(21), { score: 95 })])).toMatchObject({ level: 'Efsane', next: null });
  });

  it('günün önerisi her zaman anlamlı bir şey söyler', () => {
    expect(dailyNudge([], SAT)).toBeNull();
    const nudge = dailyNudge([cup(at(21))], SAT)!;
    expect(nudge.text.length).toBeGreaterThan(10);
    // Gün değişince öneri değişebilir ama hep tanımlı
    for (let d = 1; d <= 7; d++) expect(dailyNudge([cup(at(21))], new Date(2026, 10, 21 + d))).not.toBeNull();
  });

  it('3 gün aynı yöntem → rutin önerisi seçeneklerde', () => {
    const e = [cup(at(19)), cup(at(20)), cup(at(21))];
    const texts = new Set(Array.from({ length: 10 }, (_, i) => dailyNudge(e, new Date(2026, 10, 21, 10 + i))!.text));
    // aynı gün içinde öneri sabit kalır
    expect(texts.size).toBe(1);
  });
});
