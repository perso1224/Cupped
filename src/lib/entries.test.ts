import { describe, expect, it } from 'vitest';
import { CorruptDataError, normalizeEntry, parseEntries, toRelativePhoto } from './entries';

const good = {
  id: 'a',
  createdAt: '2026-11-20T09:00:00.000Z',
  photoUri: null,
  method: 'filter',
  placeName: null,
  venueKind: 'home',
  notes: [],
  origin: null,
  score: 55,
  parts: { base: 30, effort: 25, depth: 0, discovery: 0, selectivity: 0 },
  palateTypeId: 'pourover_philosopher',
};

describe('kayıt okuma', () => {
  it('boş depo → boş liste', () => {
    expect(parseEntries(null)).toEqual([]);
    expect(parseEntries('')).toEqual([]);
  });

  it('okunamayan veri hata fırlatır (üzerine yazılmasın)', () => {
    expect(() => parseEntries('{bozuk')).toThrow(CorruptDataError);
    expect(() => parseEntries('{"a":1}')).toThrow(CorruptDataError);
  });

  it('tek bozuk kayıt tüm listeyi düşürmez', () => {
    const list = parseEntries(JSON.stringify([good, { id: 'x' }, null, { ...good, id: 'b', createdAt: '2026-11-21T09:00:00.000Z' }]));
    expect(list.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('eksik alanlar tamamlanır', () => {
    const { notes, origin, parts, ...partial } = good;
    void notes; void origin; void parts;
    const e = normalizeEntry({ ...partial, score: '61', palateTypeId: undefined })!;
    expect(e.notes).toEqual([]);
    expect(e.origin).toBeNull();
    expect(e.brew).toBeNull();
    expect(e.score).toBe(61);
    expect(e.parts.base).toBe(0);
    expect(e.palateTypeId).toBeTruthy();
  });

  it('bilinmeyen yöntem atlanır, tekrar eden notlar teke iner', () => {
    expect(normalizeEntry({ ...good, method: 'v60' })).toBeNull();
    expect(normalizeEntry({ ...good, notes: ['bold', 'bold'] })!.notes).toEqual(['bold']);
  });

  it('aynı id iki kez varsa bir kez alınır', () => {
    expect(parseEntries(JSON.stringify([good, good]))).toHaveLength(1);
  });
});

describe('fotoğraf yolu', () => {
  it('eski tam adres göreli hale gelir', () => {
    expect(toRelativePhoto('file:///var/mobile/Containers/Data/Application/ABC/Documents/ExponentExperienceData/@x/cupped/cups/k1.jpg')).toBe('cups/k1.jpg');
    expect(toRelativePhoto('cups/k1.jpg')).toBe('cups/k1.jpg');
    expect(toRelativePhoto(null)).toBeNull();
    expect(toRelativePhoto('')).toBeNull();
  });
});

import { upper } from '../i18n/tr';
describe('Türkçe büyük harf', () => {
  it('i → İ, ı → I', () => {
    expect(upper('Fincan skoru')).toBe('FİNCAN SKORU');
    expect(upper('Başlangıç damak tipin')).toBe('BAŞLANGIÇ DAMAK TİPİN');
    expect(upper('Dönemin fincanı')).toBe('DÖNEMİN FİNCANI');
  });
});
