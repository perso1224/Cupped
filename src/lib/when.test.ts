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
