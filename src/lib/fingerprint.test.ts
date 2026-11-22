import { describe, expect, it } from 'vitest';
import { fingerprintRings, hashString, memberNo } from './fingerprint';

const base = { cups: 12, notes: [], radius: 100, cx: 120, cy: 120 };

describe('damak parmak izi', () => {
  it('aynı veri her zaman aynı izi verir, farklı tohum farklı iz', () => {
    const a = fingerprintRings({ ...base, seed: 'berat:pure_intensity' });
    expect(fingerprintRings({ ...base, seed: 'berat:pure_intensity' })).toEqual(a);
    expect(fingerprintRings({ ...base, seed: 'deniz:pure_intensity' })[0].d).not.toBe(a[0].d);
  });
  it('halka sayısı fincanla artar, 4-10 arası', () => {
    expect(fingerprintRings({ ...base, seed: 's', cups: 0 })).toHaveLength(4);
    expect(fingerprintRings({ ...base, seed: 's', cups: 15 })).toHaveLength(8);
    expect(fingerprintRings({ ...base, seed: 's', cups: 100000 })).toHaveLength(10);
  });
  it('halkalar kart alanının içinde kalır', () => {
    for (const r of fingerprintRings({ ...base, seed: 'x', notes: [{ note: 'fruity', count: 9, pct: 100 }] })) {
      for (const [, x, y] of r.d.matchAll(/([\d.]+),([\d.]+)/g)) {
        expect(Math.hypot(Number(x) - 120, Number(y) - 120)).toBeLessThanOrEqual(110);
      }
    }
  });
  it('kart numarası 4 haneli ve sabit', () => {
    expect(memberNo('2026-11-21T10:00:00.000Z')).toMatch(/^\d{4}$/);
    expect(memberNo('2026-11-21T10:00:00.000Z')).toBe(memberNo('2026-11-21T10:00:00.000Z'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
