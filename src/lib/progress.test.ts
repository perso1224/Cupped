import { describe, expect, it } from 'vitest';
import {
  badgeProgress,
  brewRatio,
  currentStreak,
  discoveriesIn,
  filterEntries,
  earnedBadges,
  isDetailed,
  passport,
  periodReport,
  periodRange,
  profileSummary,
  startOfWeek,
  weekStrip,
  weeklyPalateScore,
  weeklyRecordBefore,
} from './progress';
import type { CupEntry } from './types';

let n = 0;
/** Yerel saatle tarih: (ay 0'dan başlar) */
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

// 2026-11-18 Çarşamba
const WED = new Date(2026, 10, 18, 15);

describe('hafta ve seri', () => {
  it('hafta pazartesi başlar', () => {
    expect(startOfWeek(WED)).toEqual(new Date(2026, 10, 16));
  });

  it('seri: bugün kayıt varsa bugünden geriye sayar', () => {
    const e = [cup(at(2026, 10, 16)), cup(at(2026, 10, 17)), cup(at(2026, 10, 18))];
    expect(currentStreak(e, WED)).toBe(3);
  });

  it('seri: bugün henüz kayıt yoksa dünden sayar, boşluk seriyi bozar', () => {
    const e = [cup(at(2026, 10, 14)), cup(at(2026, 10, 16)), cup(at(2026, 10, 17))];
    expect(currentStreak(e, WED)).toBe(2);
    expect(currentStreak([cup(at(2026, 10, 15))], WED)).toBe(0);
  });

  it('haftalık şerit 7 gün, her gün en yüksek skor', () => {
    const e = [cup(at(2026, 10, 16), { score: 40 }), cup(at(2026, 10, 16, 15), { score: 70 })];
    const strip = weekStrip(e, WED);
    expect(strip).toHaveLength(7);
    expect(strip[0].best).toBe(70);
    expect(strip[1].best).toBeNull();
    expect(strip[2].isToday).toBe(true);
    expect(strip[3].isFuture).toBe(true);
  });
});

describe('Haftalık Damak Skoru', () => {
  it('çeşitlilik puanı verir', () => {
    const e = [
      cup(at(2026, 10, 16), { method: 'filter', venueKind: 'independent', placeName: 'A' }),
      cup(at(2026, 10, 17), { method: 'milk', venueKind: 'chain', placeName: 'Starbucks' }),
      cup(at(2026, 10, 18), { method: 'milk', venueKind: 'home' }),
    ];
    // 2 yöntem*12 + 2 mekan*10 + 0 not + 3 fincan*3
    expect(weeklyPalateScore(e)).toBe(53);
  });

  it('100ü geçmez', () => {
    const methods = ['espresso', 'filter', 'coldbrew', 'milk', 'turkish'] as const;
    const e = methods.map((m, i) => cup(at(2026, 10, 16 + i), { method: m, venueKind: 'independent', placeName: `P${i}`, notes: ['fruity', 'bold'] }));
    expect(weeklyPalateScore(e)).toBe(100);
  });

  it('rekor sadece önceki haftalardan', () => {
    const e = [
      cup(at(2026, 10, 10), { method: 'filter' }),
      cup(at(2026, 10, 11), { method: 'milk' }),
      cup(at(2026, 10, 17), { method: 'turkish' }),
    ];
    expect(weeklyRecordBefore(e, startOfWeek(WED))).toBe(2 * 12 + 2 * 3);
  });
});

describe('keşif ve rapor', () => {
  const e = [
    cup(at(2026, 10, 2), { method: 'filter', venueKind: 'independent', placeName: 'Eski Yer' }),
    cup(at(2026, 10, 16), { method: 'filter', venueKind: 'independent', placeName: 'eski yer', score: 45 }),
    cup(at(2026, 10, 17), { method: 'coldbrew', venueKind: 'independent', placeName: 'Yeni Yer', score: 80 }),
  ];
  const ws = startOfWeek(WED);
  const we = new Date(2026, 10, 23);

  it('sadece ilk ziyaretler keşiftir', () => {
    expect(discoveriesIn(e, ws, we)).toEqual({ places: ['Yeni Yer'], methods: ['coldbrew'] });
  });

  it('dönem raporu', () => {
    const r = periodReport(e, ws, we);
    expect(r.cups).toBe(2);
    expect(r.avg).toBe(63);
    expect(r.best?.score).toBe(80);
    expect(r.places).toBe(2);
    expect(r.newPlaces).toBe(1);
  });

  it('boş dönem', () => {
    const r = periodReport([], ws, we);
    expect(r.cups).toBe(0);
    expect(r.best).toBeNull();
    expect(r.palateTypeId).toBeNull();
  });
});

describe('pasaport ve rozetler', () => {
  it('mekanları ziyaret sayısıyla toplar', () => {
    const p = passport([
      cup(at(2026, 10, 1), { venueKind: 'independent', placeName: 'Kavurucu' }),
      cup(at(2026, 10, 2), { venueKind: 'independent', placeName: 'KAVURUCU' }),
      cup(at(2026, 10, 3), { venueKind: 'chain', placeName: 'Starbucks', method: 'milk', palateTypeId: 'oat_milk_diplomat' }),
    ]);
    expect(p.places).toMatchObject([
      { name: 'Kavurucu', visits: 2, firstVisit: at(2026, 10, 1) },
      { name: 'Starbucks', visits: 1, firstVisit: at(2026, 10, 3) },
    ]);
    expect(p.methods).toEqual(['espresso', 'milk']);
    expect(p.palateTypeIds).toEqual(['pure_intensity', 'oat_milk_diplomat']);
  });

  const ids = (list: CupEntry[]) => earnedBadges(list).map((b) => b.id);

  it('Rutine Saplandın: 5 gün üst üste aynı yöntem', () => {
    const five = [1, 2, 3, 4, 5].map((d) => cup(at(2026, 10, d)));
    expect(ids(five)).toContain('routine');
    expect(ids(five.slice(0, 4))).not.toContain('routine');
    const broken = [...five.slice(0, 4), cup(at(2026, 10, 5), { method: 'milk' })];
    expect(ids(broken)).not.toContain('routine');
  });

  it('Zincir Sadıkı: art arda 3 aynı zincir', () => {
    const s = { venueKind: 'chain' as const, placeName: 'Starbucks' };
    expect(ids([1, 2, 3].map((d) => cup(at(2026, 10, d), s)))).toContain('chain_loyal');
  });

  it('Pour-over Sabrı, Üçüncü Dalga Mülteci, İlk Geisha, Ayda 5 Yeni Mekan', () => {
    const home = [1, 3, 5, 7, 9].map((d) => cup(at(2026, 10, d), { method: 'filter' }));
    expect(ids(home)).toContain('pourover_patience');
    const indep = [1, 2, 3, 4, 5].map((d) => cup(at(2026, 10, d, 12), { venueKind: 'independent', placeName: `Yer ${d}` }));
    expect(ids(indep)).toEqual(expect.arrayContaining(['third_wave_refugee', 'five_new_month']));
    expect(ids([cup(at(2026, 10, 1), { origin: 'Panama Geisha' })])).toContain('first_geisha');
  });
});

describe('profil özeti', () => {
  it('ortalama, mekan, yöntem ve seri', () => {
    const s = profileSummary(
      [
        cup(at(2026, 10, 17), { score: 40, venueKind: 'chain', placeName: 'Starbucks', method: 'milk' }),
        cup(at(2026, 10, 18), { score: 61, venueKind: 'independent', placeName: 'starbucks' }),
      ],
      WED,
    );
    expect(s).toMatchObject({ cups: 2, avg: 51, places: 1, methods: 2, streak: 2 });
    expect(profileSummary([], WED).palateTypeId).toBeNull();
  });
});

describe('detay modu', () => {
  it('detaylı kayıt tespiti', () => {
    expect(isDetailed({ notes: [], origin: null })).toBe(false);
    expect(isDetailed({ notes: [], origin: '  ' })).toBe(false);
    expect(isDetailed({ notes: ['fruity'], origin: null })).toBe(true);
    expect(isDetailed({ notes: [], origin: 'Kenya' })).toBe(true);
    expect(isDetailed({ notes: [], origin: null, brew: { doseG: 15, waterMl: null, grind: null } })).toBe(true);
    expect(isDetailed({ notes: [], origin: null, note: 'güzeldi' })).toBe(true);
  });

  it('kahve:su oranı', () => {
    expect(brewRatio(15, 250)).toBe('1:17');
    expect(brewRatio(18, 36)).toBe('1:2');
    expect(brewRatio(null, 250)).toBeNull();
    expect(brewRatio(0, 250)).toBeNull();
  });

  it('Derinlik rozeti: 5 detaylı fincan', () => {
    const ids = (list: CupEntry[]) => earnedBadges(list).map((b) => b.id);
    const four = [1, 2, 3, 4].map((d) => cup(at(2026, 10, d), { origin: 'Etiyopya' }));
    expect(ids(four)).not.toContain('depth');
    expect(ids([...four, cup(at(2026, 10, 5), { notes: ['bold'] })])).toContain('depth');
  });
});

describe('dönem aralığı', () => {
  it('bu ay / geçen ay (yıl geçişi dahil)', () => {
    expect(periodRange('month', 0, WED)).toEqual({ start: new Date(2026, 10, 1), end: new Date(2026, 11, 1) });
    expect(periodRange('month', -1, new Date(2026, 0, 3))).toEqual({ start: new Date(2025, 11, 1), end: new Date(2026, 0, 1) });
  });
  it('bu hafta / geçen hafta', () => {
    expect(periodRange('week', 0, WED)).toEqual({ start: new Date(2026, 10, 16), end: new Date(2026, 10, 23) });
    expect(periodRange('week', -1, WED)).toEqual({ start: new Date(2026, 10, 9), end: new Date(2026, 10, 16) });
  });
});

describe('rozet ilerlemesi', () => {
  it('kilitli rozetler ilerleme gösterir', () => {
    const p = badgeProgress([
      cup(at(2026, 10, 1), { venueKind: 'independent', placeName: 'A' }),
      cup(at(2026, 10, 2), { venueKind: 'independent', placeName: 'B' }),
      cup(at(2026, 10, 3), { method: 'filter' }),
    ]);
    const get = (id: string) => p.find((x) => x.badge.id === id)!;
    expect(get('third_wave_refugee')).toMatchObject({ current: 2, target: 5, earned: false });
    expect(get('pourover_patience')).toMatchObject({ current: 1, target: 5 });
    expect(get('first_geisha')).toMatchObject({ current: 0, target: 1 });
    expect(p.every((x) => x.badge.howTo.length > 0)).toBe(true);
  });
});

describe('mekan kimliği (skorla tutarlı)', () => {
  it('zincir şubeleri pasaportta tek mekan sayılır', () => {
    const list = [
      cup(at(2026, 10, 2), { placeName: 'Starbucks Moda', venueKind: 'chain' }),
      cup(at(2026, 10, 3), { placeName: 'Starbucks Kadıköy', venueKind: 'chain' }),
    ];
    const p = passport(list);
    expect(p.places).toHaveLength(1);
    expect(p.places[0]).toMatchObject({ name: 'Starbucks', visits: 2 });
  });
  it('Latin dışı mekan adı yine bir mekan sayılır', () => {
    expect(passport([cup(at(2026, 10, 2), { placeName: 'カフェ', venueKind: 'independent' })]).places).toHaveLength(1);
  });
});

describe('filterEntries', () => {
  it('mekan anahtarına (zincir dahil) ve yönteme göre süzer', () => {
    const list = [
      cup(at(2026, 10, 2), { placeName: 'Starbucks Moda', venueKind: 'chain', method: 'milk' }),
      cup(at(2026, 10, 3), { placeName: 'Starbucks Kadıköy', venueKind: 'chain', method: 'espresso' }),
      cup(at(2026, 10, 4), { placeName: 'Kör Nokta', venueKind: 'independent', method: 'espresso' }),
    ];
    const key = passport(list).places.find((p) => p.name === 'Starbucks')!.key;
    expect(filterEntries(list, { place: key })).toHaveLength(2);
    expect(filterEntries(list, { method: 'espresso' })).toHaveLength(2);
    expect(filterEntries(list, { place: key, method: 'espresso' })).toHaveLength(1);
  });
});
