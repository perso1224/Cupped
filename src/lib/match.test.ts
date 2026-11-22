import { describe, expect, it } from 'vitest';
import { compatibility, decodeCode, encodeProfile, tasteProfile, type TasteProfile } from './match';
import type { CupEntry } from './types';

const P = (p: Partial<TasteProfile>): TasteProfile => ({
  typeId: 'pure_intensity',
  notes: [],
  methods: { espresso: 0, filter: 0, coldbrew: 0, milk: 0, turkish: 0 },
  home: 0,
  cafe: 0,
  ...p,
});

describe('damak kodu', () => {
  it('kodla-çöz aynı profili verir', () => {
    const p = P({ typeId: 'acid_romantic', notes: ['bright', 'floral'], methods: { espresso: 1, filter: 3, coldbrew: 0, milk: 2, turkish: 1 }, home: 2, cafe: 3 });
    const code = encodeProfile(p);
    expect(code).toMatch(/^[0-9A-Z]{3}-[0-9A-Z]{3}$/);
    expect(decodeCode(code)).toEqual(p);
    expect(decodeCode(code.toLowerCase().replace('-', ' '))).toEqual(p);
  });
  it('yazım hatası ya da uydurma kod reddedilir', () => {
    const code = encodeProfile(P({ notes: ['chocolate'] }));
    const wrong = code.slice(0, 5) + (code[5] === 'A' ? 'B' : 'A');
    expect(decodeCode(wrong)).toBeNull();
    expect(decodeCode('12345')).toBeNull();
    expect(decodeCode('#$%^&*')).toBeNull();
  });
  it('kodda kişisel veri yok: yalnızca zevk özeti', () => {
    const e = (i: number): CupEntry => ({ id: String(i), createdAt: new Date(2026, 10, i).toISOString(), photoUri: null, method: 'filter', placeName: 'Gizli Kafe', venueKind: 'independent', notes: ['fruity'], origin: 'Kenya', note: 'özel not', score: 60, parts: { base: 40, effort: 15, depth: 0, discovery: 5, selectivity: 0 }, palateTypeId: 'floral_explorer' });
    const p = tasteProfile([e(1), e(2)], 'floral_explorer')!;
    expect(Object.keys(p).sort()).toEqual(['cafe', 'home', 'methods', 'notes', 'typeId']);
    expect(JSON.stringify(decodeCode(encodeProfile(p)))).not.toMatch(/Gizli|Kenya|özel/);
  });
});

describe('uyum', () => {
  it('aynı zevk yüksek, zıt zevk düşük; simetrik', () => {
    const a = P({ notes: ['chocolate', 'nutty'], methods: { espresso: 3, filter: 0, coldbrew: 0, milk: 1, turkish: 0 }, cafe: 3 });
    const b = P({ typeId: 'acid_romantic', notes: ['bright', 'floral'], methods: { espresso: 0, filter: 3, coldbrew: 1, milk: 0, turkish: 0 }, home: 3 });
    expect(compatibility(a, a).pct).toBeGreaterThan(90);
    expect(compatibility(a, b).pct).toBeLessThan(40);
    expect(compatibility(a, b).pct).toBe(compatibility(b, a).pct);
    expect(compatibility(a, a).common).toEqual({ kind: 'note', note: 'chocolate' });
    expect(compatibility(a, b).clash).toBe('espressoFilter');
  });
});

describe('kod ayıklama ve Türkçe klavye', () => {
  it('paylaşılan mesajın tamamından kodu çıkarır; İ kabul edilir', async () => {
    const { extractCode, encodeProfile, decodeCode, canonicalCode } = await import('./match');
    const code = encodeProfile({ typeId: 'classic_master', notes: ['chocolate'], methods: { espresso: 3, filter: 1, coldbrew: 0, milk: 0, turkish: 2 }, home: 1, cafe: 2 });
    expect(extractCode(`Cupped damak kodum: ${code}\nUygulamada Profil > Damak Uyumu'na yaz`)).toBe(code);
    const withDotted = code.replace(/1/g, 'İ');
    expect(decodeCode(withDotted)).not.toBeNull();
    expect(canonicalCode(code.toLowerCase())).toBe(code);
  });
});
