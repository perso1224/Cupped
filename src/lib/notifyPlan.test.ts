import { describe, expect, it } from 'vitest';
import { MAX_PER_DAY, notificationPlan, parseTarget, targetHref, type NotifyPrefs } from './notifyPlan';
import { dayKey } from './progress';
import type { CupEntry } from './types';

let n = 0;
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h).toISOString();
function cup(createdAt: string, p: Partial<CupEntry> = {}): CupEntry {
  n++;
  return {
    id: String(n),
    createdAt,
    photoUri: null,
    method: 'espresso',
    placeName: null,
    venueKind: 'home',
    notes: [],
    origin: null,
    score: 50,
    parts: { base: 30, effort: 20, depth: 0, discovery: 0, selectivity: 0 },
    palateTypeId: 'pure_intensity',
    ...p,
  };
}

const NONE: NotifyPrefs = { daily: false, streak: false, weekly: false, monthly: false, comeback: false };
const ALL: NotifyPrefs = { daily: true, streak: true, weekly: true, monthly: true, comeback: true };
// 2026-11-18 Çarşamba 15:00
const WED = new Date(2026, 10, 18, 15);
const plan = (e: CupEntry[], p: Partial<NotifyPrefs>, now = WED, h = 20, m = 30) => notificationPlan(e, { ...NONE, ...p }, now, h, m);

describe('seri tehlikede', () => {
  const streak3 = [cup(at(2026, 10, 15)), cup(at(2026, 10, 16)), cup(at(2026, 10, 17))];
  it('bugün fincan yoksa bugün 22:00', () => {
    const r = plan(streak3, { streak: true });
    expect(r).toHaveLength(1);
    expect(r[0].at).toEqual(new Date(2026, 10, 18, 22));
    expect(r[0].body).toContain('3 gün');
  });
  it('bugün eklendiyse yarın 22:00', () => {
    const r = plan([...streak3, cup(at(2026, 10, 18))], { streak: true });
    expect(r[0].at).toEqual(new Date(2026, 10, 19, 22));
    expect(r[0].body).toContain('4 gün');
  });
  it('1 günlük seride ya da 22:00 geçtiyse yok', () => {
    expect(plan([cup(at(2026, 10, 17))], { streak: true })).toHaveLength(0);
    expect(plan(streak3, { streak: true }, new Date(2026, 10, 18, 22, 30))).toHaveLength(0);
  });
  it('günlük hatırlatma 21:00 sonrasındaysa tekrar söylemez', () => {
    expect(plan(streak3, { streak: true, daily: true }, WED, 22, 0).filter((x) => x.kind === 'streak')).toHaveLength(0);
  });
});

describe('haftalık özet', () => {
  it('bu Pazar 19:00, bu haftanın fincanlarıyla', () => {
    const r = plan([cup(at(2026, 10, 16), { score: 60, method: 'filter' }), cup(at(2026, 10, 17), { score: 80, method: 'filter' })], { weekly: true });
    expect(r).toHaveLength(1);
    expect(r[0].at).toEqual(new Date(2026, 10, 22, 19));
    expect(r[0].body).toContain('2 fincan');
    expect(r[0].body).toContain('ortalama skor 70');
    expect(r[0].body).toContain('Filtre');
    expect(r[0].target).toEqual({ route: 'wrapped', period: 'week', start: '2026-11-16' });
  });
  it('hafta boşsa gönderilmez', () => {
    expect(plan([cup(at(2026, 10, 10))], { weekly: true })).toHaveLength(0);
  });
  it('Pazar 19:00 geçtiyse gelecek hafta (o hafta boş → yok)', () => {
    expect(plan([cup(at(2026, 10, 22, 9))], { weekly: true }, new Date(2026, 10, 22, 20))).toHaveLength(0);
  });
});

describe('aylık özet', () => {
  it('gelecek ayın 1i 11:00', () => {
    const r = plan([cup(at(2026, 10, 3), { score: 90 }), cup(at(2026, 10, 10))], { monthly: true });
    expect(r[0].at).toEqual(new Date(2026, 11, 1, 11));
    expect(r[0].title).toBe('Kasım özetin hazır ☕');
    expect(r[0].body).toContain('2 fincan');
    expect(r[0].body).toContain('90');
  });
  it("ayın 1'inde 11:00'den önce yeniden kurulunca biten ayın özeti kaybolmaz", () => {
    // Aralık'ta ayrıca yıllık özet de kurulur; burada yalnızca aylık özete bakılır
    const r = plan([cup(at(2026, 10, 3))], { monthly: true }, new Date(2026, 11, 1, 8)).filter((x) => !x.title.includes('Damak Özetin'));
    expect(r).toHaveLength(1);
    expect(r[0].at).toEqual(new Date(2026, 11, 1, 11));
    expect(r[0].title).toBe('Kasım özetin hazır ☕');
  });
  it('Aralık → Ocak', () => {
    const r = plan([cup(at(2026, 11, 3))], { monthly: true }, new Date(2026, 11, 20)).filter((x) => !x.title.includes('Damak Özetin'));
    expect(r[0].at).toEqual(new Date(2027, 0, 1, 11));
  });
});

describe('geri dön', () => {
  it('3, 7, 14 gün sonra; o günün günlük hatırlatmasının yerine', () => {
    const r = plan([cup(at(2026, 10, 18))], { comeback: true, daily: true });
    const back = r.filter((x) => x.kind === 'comeback');
    expect(back.map((x) => dayKey(x.at))).toEqual(['2026-11-21', '2026-11-25', '2026-12-02']);
    expect(back[0].at.getHours()).toBe(20);
    expect(r.some((x) => x.kind === 'daily' && dayKey(x.at) === '2026-11-21')).toBe(false);
    expect(r.some((x) => x.kind === 'daily' && dayKey(x.at) === '2026-11-20')).toBe(true);
  });
  it('günlük kapalıysa 18:00; hiç fincan yoksa yok', () => {
    expect(plan([cup(at(2026, 10, 18))], { comeback: true })[0].at.getHours()).toBe(18);
    expect(plan([], { comeback: true })).toHaveLength(0);
  });
});

describe('günlük sınır', () => {
  it(`hiçbir gün ${MAX_PER_DAY} bildirimden fazla değil`, () => {
    // Pazar: haftalık + seri + günlük çakışır
    const sun = new Date(2026, 10, 22, 8);
    const e = [cup(at(2026, 10, 19)), cup(at(2026, 10, 20)), cup(at(2026, 10, 21))];
    const r = notificationPlan(e, ALL, sun, 20, 30);
    const count = new Map<string, number>();
    for (const x of r) count.set(dayKey(x.at), (count.get(dayKey(x.at)) ?? 0) + 1);
    expect(Math.max(...count.values())).toBeLessThanOrEqual(MAX_PER_DAY);
    const today = r.filter((x) => dayKey(x.at) === '2026-11-22').map((x) => x.kind);
    expect(today).toEqual(['weekly', 'streak']);
    // sıralı
    expect(r.map((x) => x.at.getTime())).toEqual([...r.map((x) => x.at.getTime())].sort((a, b) => a - b));
  });
});

describe('dokununca açılacak yer', () => {
  it('özet dönemi dokunma gününe göre çevrilir', () => {
    const t = { route: 'wrapped', period: 'week', start: '2026-11-16' } as const;
    expect(targetHref(t, new Date(2026, 10, 22, 19))).toBe('/wrapped?period=week&offset=0');
    expect(targetHref(t, new Date(2026, 10, 23, 9))).toBe('/wrapped?period=week&offset=-1');
    const m = { route: 'wrapped', period: 'month', start: '2026-11-01' } as const;
    expect(targetHref(m, new Date(2026, 11, 1, 11))).toBe('/wrapped?period=month&offset=-1');
    expect(targetHref(m, new Date(2027, 0, 5))).toBe('/progress');
    expect(targetHref({ route: 'new' })).toBe('/new');
  });
  it('bozuk veri → null', () => {
    expect(parseTarget(undefined)).toBeNull();
    expect(parseTarget({ target: { route: 'x' } })).toBeNull();
    expect(parseTarget({ target: { route: 'wrapped', period: 'week', start: 'dün' } })).toBeNull();
    expect(parseTarget({ target: { route: 'new' } })).toEqual({ route: 'new' });
  });
});

describe('yıllık özet', () => {
  it('31 Aralık 19:00, o yıl fincan varsa; dokununca yıllık özet', () => {
    const r = plan([cup(at(2026, 2, 3)), cup(at(2026, 11, 2))], { monthly: true }, new Date(2026, 11, 5, 9));
    const y = r.find((x) => x.title.includes('2026'));
    expect(y?.at).toEqual(new Date(2026, 11, 31, 19));
    expect(y?.target).toEqual({ route: 'wrapped', period: 'year', start: '2026-01-01' });
    expect(targetHref(y!.target, new Date(2026, 11, 31, 20))).toBe('/wrapped?period=year&offset=0');
    expect(targetHref(y!.target, new Date(2027, 0, 2))).toBe('/wrapped?period=year&offset=-1');
  });
  it('Aralık dışında kurulmaz', () => {
    const r = plan([cup(at(2026, 5, 3))], { monthly: true }, new Date(2026, 5, 10, 9));
    expect(r.some((x) => x.title.includes('Damak Özetin'))).toBe(false);
  });
});
