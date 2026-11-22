import { describe, expect, it } from 'vitest';
import { normalizePlace } from '../lib/scoring';
import { applyOrigin, filterOrigins, originOptions, VARIETIES } from './origins';

describe('origins', () => {
  it('menşei ve çeşit yan yana birleşir; yeniden seçim sadece kendi parçasını değiştirir', () => {
    let v = applyOrigin('', { label: 'Panama Boquete', kind: 'origin' });
    expect(v).toBe('Panama Boquete');
    v = applyOrigin(v, { label: 'Geisha (Gesha)', kind: 'variety' });
    expect(v).toBe('Panama Boquete · Geisha (Gesha)');
    v = applyOrigin(v, { label: 'Kolombiya Huila', kind: 'origin' });
    expect(v).toBe('Kolombiya Huila · Geisha (Gesha)');
    expect(applyOrigin('', { label: 'Bourbon', kind: 'variety' })).toBe('Bourbon');
  });
  it('arama büyük/küçük harf ve aksan duyarsız', () => {
    const r = filterOrigins(originOptions(), 'tarrazu');
    expect(r.flatMap((s) => s.data.map((o) => o.label))).toEqual(['Kosta Rika Tarrazú']);
    expect(filterOrigins(originOptions(), 'ETİYOPYA')[0].data[0].label).toBe('Etiyopya');
    expect(filterOrigins(originOptions(), 'zzzz')).toEqual([]);
  });
  it('Geisha seçimi Geisha rozetini tetikleyecek şekilde yazılır; etiketler tekrarsız', () => {
    expect(normalizePlace(VARIETIES[0])).toContain('geisha');
    const labels = originOptions().flatMap((s) => s.data.map((o) => `${o.kind}:${o.label}`));
    expect(new Set(labels).size).toBe(labels.length);
  });
});
