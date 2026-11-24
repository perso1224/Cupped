import { describe, expect, it } from 'vitest';
import { CAFFEINE_MG } from '../config/scoring.config';
import { buildWidgetData, WALL_DAYS } from './widgetData';
import type { CupEntry } from './types';

let n = 0;
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h).toISOString();
const cup = (createdAt: string, score = 50, p: Partial<CupEntry> = {}) => ({ id: String(++n), createdAt, score, method: 'espresso', ...p }) as CupEntry;

describe('widget özeti', () => {
  const now = new Date(2026, 10, 24, 15);
  it('gün başına fincan, toplam, en iyi skor ve kafein', () => {
    const r = buildWidgetData([cup(at(2026, 10, 24), 60), cup(at(2026, 10, 24, 12), 80, { method: 'filter' }), cup(at(2026, 10, 23), 70)], now);
    expect(r.days['2026-11-24']).toEqual([2, 140, 80, CAFFEINE_MG.espresso + CAFFEINE_MG.filter]);
    expect(r.days['2026-11-23']).toEqual([1, 70, 70, CAFFEINE_MG.espresso]);
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
  it('Fincan Duvarı: bugünde biten 182 gün, en fazla 3', () => {
    const r = buildWidgetData([cup(at(2026, 10, 24)), cup(at(2026, 10, 24)), cup(at(2026, 10, 24)), cup(at(2026, 10, 24)), cup(at(2026, 10, 22))], now);
    expect(r.wall).toHaveLength(WALL_DAYS);
    expect(r.wall.slice(-3)).toBe('103');
    expect(r.wallEnd).toBe('2026-11-24');
  });
  it('son fincan', () => {
    const r = buildWidgetData([cup(at(2026, 10, 20), 40), cup(at(2026, 10, 23), 77, { method: 'filter', rating: 4, placeName: ' Kronotrop ' })], now, 300);
    expect(r.last).toEqual({ at: at(2026, 10, 23), score: 77, method: 'Filtre / V60', rating: 4, place: 'Kronotrop' });
    expect(r.caffeineRef).toBe(300);
  });
  it('boş', () => {
    const r = buildWidgetData([], now);
    expect(r).toMatchObject({ days: {}, streak: 0, streakDay: null, last: null });
    expect(r.wall).toBe('0'.repeat(WALL_DAYS));
  });
});
