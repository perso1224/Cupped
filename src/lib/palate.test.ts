import { describe, expect, it } from 'vitest';
import { PALATE_TYPES } from '../config/scoring.config';
import { computePalateTypeId, rawPalateTypeId, getPalateType, palateReason } from './palate';
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
    expect(rawPalateTypeId(cups)).toBe('cafe_nomad');
  });

  it('iki yöntem arasında gidip gelmek tipi her fincanda değiştirmez', () => {
    const at = (i: number) => new Date(2026, 9, 1 + i, 9).toISOString();
    const cups = Array.from({ length: 20 }, (_, i) => cup({ method: i % 2 ? 'espresso' : 'filter', venueKind: 'home', createdAt: at(i) }));
    const types = cups.map((_, i) => computePalateTypeId(cups.slice(0, i + 1)));
    const changes = types.filter((t, i) => i > 0 && t !== types[i - 1]).length;
    expect(changes).toBeLessThanOrEqual(1);
  });

  it('kararlılık: tek bir farklı fincan tipi değiştirmez, art arda ikisi değiştirir', () => {
    const at = (i: number) => new Date(2026, 10, 1 + i, 9).toISOString();
    const base = Array.from({ length: 6 }, (_, i) => cup({ method: 'espresso', createdAt: at(i) }));
    const typeBefore = computePalateTypeId(base);
    const one = [...base, cup({ method: 'milk', createdAt: at(6) }), ...[]];
    // tek sütlü: ham hesap değişmese de değişse de tip yerinde kalır
    expect(computePalateTypeId(one)).toBe(typeBefore);
    const withNotes = [...base, cup({ notes: ['bright', 'fruity'], createdAt: at(6) })];
    expect(computePalateTypeId(withNotes)).toBe(typeBefore);
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

describe('Damak Tipi kararlılığı', () => {
  it('tek bir detaylı fincan tipi değiştirmez', () => {
    const cups = Array.from({ length: 9 }, () => cup({ method: 'milk', venueKind: 'chain', placeName: 'Starbucks' }));
    cups.push(cup({ method: 'milk', venueKind: 'chain', placeName: 'Starbucks', notes: ['fruity'] }));
    expect(computePalateTypeId(cups)).toBe('oat_milk_diplomat');
  });

  it('dönemin tamamına bakınca en sık yöntemle çelişmez', () => {
    const cups = [
      ...Array.from({ length: 20 }, () => cup({ method: 'milk', venueKind: 'chain', placeName: 'Starbucks' })),
      ...Array.from({ length: 10 }, () => cup({ method: 'filter', venueKind: 'home' })),
    ];
    expect(computePalateTypeId(cups)).toBe('pourover_philosopher'); // profil: son 10 fincan
    expect(computePalateTypeId(cups, { wholePeriod: true })).toBe('oat_milk_diplomat'); // Özet: tüm dönem
  });
});

describe('damak tipi gerekçesi', () => {
  it('yönteme göre tipte en sık yöntemi söyler', () => {
    const at = (i: number) => new Date(2026, 9, 1 + i, 9).toISOString();
    const cups = Array.from({ length: 4 }, (_, i) => cup({ method: 'espresso', createdAt: at(i) }));
    expect(palateReason(cups)).toEqual({ kind: 'method', method: 'espresso', home: null });
  });
  it('fincan yoksa gerekçe yok', () => {
    expect(palateReason([])).toBeNull();
  });
});
