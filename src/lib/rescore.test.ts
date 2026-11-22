import { describe, expect, it } from 'vitest';
import { rescoreAfter } from './rescore';
import type { CupEntry } from './types';

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
