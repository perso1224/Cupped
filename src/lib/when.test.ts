import { describe, expect, it } from 'vitest';
import { whenToDate } from './when';

describe('ne zaman', () => {
  it('şimdi aynı an, dün bir önceki gün aynı saat', () => {
    const now = new Date(2026, 2, 1, 0, 30); // ay başı gece yarısından sonra
    expect(whenToDate('now', now)).toBe(now);
    const y = whenToDate('yesterday', now);
    expect([y.getFullYear(), y.getMonth(), y.getDate(), y.getHours(), y.getMinutes()]).toEqual([2026, 1, 28, 0, 30]);
  });
});

describe('geriye ekleme (son 7 gün)', () => {
  it('sayı: o kadar gün önce aynı saat', () => {
    const now = new Date(2026, 10, 25, 9, 30);
    expect(whenToDate(3, now)).toEqual(new Date(2026, 10, 22, 9, 30));
    expect(whenToDate(6, new Date(2026, 11, 2, 8))).toEqual(new Date(2026, 10, 26, 8));
  });
});
