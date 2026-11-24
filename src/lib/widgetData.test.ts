import { describe, expect, it } from 'vitest';
import { buildWidgetData } from './widgetData';
import type { CupEntry } from './types';

let n = 0;
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h).toISOString();
const cup = (createdAt: string, score = 50) => ({ id: String(++n), createdAt, score }) as CupEntry;

describe('widget özeti', () => {
  const now = new Date(2026, 10, 24, 15);
  it('gün başına fincan, toplam ve en iyi skor', () => {
    const r = buildWidgetData([cup(at(2026, 10, 24), 60), cup(at(2026, 10, 24, 12), 80), cup(at(2026, 10, 23), 70)], now);
    expect(r.days['2026-11-24']).toEqual([2, 140, 80]);
    expect(r.days['2026-11-23']).toEqual([1, 70, 70]);
  });
  it('14 günden eski günler yazılmaz ama seriye sayılır', () => {
    const e = Array.from({ length: 20 }, (_, i) => cup(at(2026, 10, 24 - i)));
    const r = buildWidgetData(e, now);
    expect(Object.keys(r.days)).toHaveLength(14);
    expect(r.streak).toBe(20);
    expect(r.streakDay).toBe('2026-11-24');
  });
  it('seri en son fincan gününde biter (widget bugün/dün kontrolünü kendisi yapar)', () => {
    const r = buildWidgetData([cup(at(2026, 10, 20)), cup(at(2026, 10, 19)), cup(at(2026, 10, 17))], now);
    expect(r.streak).toBe(2);
    expect(r.streakDay).toBe('2026-11-20');
  });
  it('boş', () => {
    expect(buildWidgetData([], now)).toEqual({ v: 1, days: {}, streak: 0, streakDay: null });
  });
});
