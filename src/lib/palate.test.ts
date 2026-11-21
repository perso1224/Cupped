import { describe, expect, it } from 'vitest';
import { PALATE_TYPES } from '../config/scoring.config';
import { computePalateTypeId, getPalateType } from './palate';
import type { CupEntry } from './types';

let n = 0;
type Src = Pick<CupEntry, 'method' | 'venueKind' | 'placeName' | 'notes' | 'createdAt'>;
const cup = (p: Partial<Src>): Src => {
  n++;
  return {
    method: 'espresso',
    venueKind: 'home',
    placeName: null,
    notes: [],
    createdAt: new Date(2026, 0, n).toISOString(),
    ...p,
  };
};

describe('Damak Tipi', () => {
  it('basit mod: yönteme göre', () => {
    expect(computePalateTypeId([cup({ method: 'milk', venueKind: 'chain', placeName: 'Starbucks' })])).toBe('oat_milk_diplomat');
    expect(computePalateTypeId([cup({ method: 'espresso' })])).toBe('pure_intensity');
    expect(computePalateTypeId([cup({ method: 'turkish' })])).toBe('foam_guardian');
    expect(computePalateTypeId([cup({ method: 'coldbrew' })])).toBe('cool_head');
  });

  it('filtre: evde → Pour-over Filozofu, dışarıda → Üçüncü Dalga Gezgini', () => {
    expect(computePalateTypeId([cup({ method: 'filter', venueKind: 'home' })])).toBe('pourover_philosopher');
    expect(computePalateTypeId([cup({ method: 'filter', venueKind: 'independent', placeName: 'X' })])).toBe('third_wave_nomad');
  });

  it('çok farklı mekan → Kafe Göçebesi', () => {
    const cups = ['A', 'B', 'C', 'D'].map((p) => cup({ method: 'milk', venueKind: 'independent', placeName: p }));
    expect(computePalateTypeId(cups)).toBe('cafe_nomad');
  });

  it('detay modu: tat notu çiftinden', () => {
    expect(computePalateTypeId([cup({ notes: ['bright', 'fruity'] })])).toBe('floral_explorer');
    expect(computePalateTypeId([cup({ notes: ['nutty', 'chocolate'] })])).toBe('classic_master');
  });

  it('detay modu: eşleşen çift yoksa en sık nota', () => {
    expect(computePalateTypeId([cup({ notes: ['bold'] }), cup({ notes: ['bold', 'floral'] })])).toBe('pure_intensity');
  });

  it('boş geçmişte de bir tip döner', () => {
    expect(getPalateType(computePalateTypeId([])).name).toBeTruthy();
  });

  it('tüm tip kimlikleri benzersiz ve 12-16 arası', () => {
    const ids = PALATE_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(12);
    expect(ids.length).toBeLessThanOrEqual(16);
  });
});
