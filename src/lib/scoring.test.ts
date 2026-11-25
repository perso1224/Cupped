import { describe, expect, it } from 'vitest';
import { classifyPlace, levelFor, matchChain, newPlaceCapped, scoreCup } from './scoring';
import type { CupEntry, CupInput } from './types';

let n = 0;
function entry(p: Partial<CupEntry>): CupEntry {
  n++;
  return {
    id: String(n),
    createdAt: new Date(2026, 0, n).toISOString(),
    photoUri: null,
    method: 'espresso',
    placeName: null,
    venueKind: 'home',
    notes: [],
    origin: null,
    score: 0,
    parts: { base: 0, effort: 0, depth: 0, discovery: 0, selectivity: 0 },
    palateTypeId: 'pure_intensity',
    ...p,
  };
}
const input = (p: Partial<CupInput>): CupInput => ({
  method: 'espresso',
  placeName: null,
  venueKind: 'home',
  notes: [],
  origin: null,
  ...p,
});

describe('zincir eşleştirme', () => {
  it('Türkçe karakter ve büyük/küçük harf farkını yok sayar', () => {
    expect(matchChain('kahve dunyasi')).toBe('Kahve Dünyası');
    expect(matchChain('STARBUCKS Kadıköy')).toBe('Starbucks');
    expect(matchChain('Gloria Jeans')).toBe("Gloria Jean's");
  });
  it('kelimenin içinde geçen kısa zincir adı eşleşmez', () => {
    expect(matchChain('Armado Coffee')).toBeNull();
    expect(matchChain('Madonna Cafe')).toBeNull();
    expect(matchChain('Acostambre')).toBeNull();
  });
  it('farklı yazımlar ve şubeler tanınır', () => {
    expect(matchChain('Cafe Nero')).toBe('Caffè Nero');
    expect(matchChain('Nero Kahve')).toBe('Caffè Nero');
    expect(matchChain('Gloria')).toBe("Gloria Jean's");
    expect(matchChain('Espresso Lab Moda')).toBe('Espressolab');
    expect(matchChain('Starbucks Reserve')).toBe('Starbucks');
    expect(matchChain('Mado Kadıköy')).toBe('Mado');
    expect(matchChain('kahvedunyasikadikoy')).toBe('Kahve Dünyası');
    expect(matchChain('  ')).toBeNull();
  });
  it('listede olmayan mekan bağımsızdır', () => {
    expect(classifyPlace('Mahalle Kavurucusu')).toBe('independent');
    expect(classifyPlace('Starbucks')).toBe('chain');
  });
});

describe('Fincan Skoru', () => {
  it('ilk kayıt: taban + emek + yeni yöntem', () => {
    const r = scoreCup(input({ method: 'filter', venueKind: 'home' }), []);
    expect(r.parts).toEqual({ base: 40, effort: 25, depth: 0, discovery: 10, selectivity: 0 });
    expect(r.total).toBe(75);
  });

  it('yeni bağımsız mekan keşif puanı alır, aynı mekana tekrar gidince almaz', () => {
    const first = scoreCup(input({ venueKind: 'independent', placeName: 'Mahalle Kavurucusu' }), []);
    expect(first.parts.discovery).toBe(25); // yeni mekan + yeni yöntem
    const history = [entry({ venueKind: 'independent', placeName: 'mahalle kavurucusu' })];
    const soon = new Date(Date.parse(history[0].createdAt) + 86400000).toISOString(); // ertesi gün, aynı ay
    const again = scoreCup(input({ venueKind: 'independent', placeName: 'Mahalle Kavurucusu' }), history, soon);
    expect(again.parts.discovery).toBe(0);
    expect(again.total).toBe(55);
  });

  it('ofis ve zincir kahvesi en düşük emek (10)', () => {
    const history = [entry({ method: 'espresso' })];
    const soon = new Date(Date.parse(history[0].createdAt) + 3600000).toISOString();
    expect(scoreCup(input({ venueKind: 'office' }), history, soon).total).toBe(50);
  });

  it('zincire art arda gitmek artık cezalandırılmaz (Müdavim rozetiyle çelişmesin)', () => {
    const s = { venueKind: 'chain' as const, placeName: 'Starbucks' };
    const h2 = [entry(s), entry(s)];
    const soon = new Date(Date.parse(h2[1].createdAt) + 3600000).toISOString();
    expect(scoreCup(input(s), h2, soon).parts.selectivity).toBe(0); // 3. ziyaret
    expect(scoreCup(input(s), h2, soon).total).toBe(50);
  });

  it('30+ gün sonra dönülen mekan +5, bu ay ilk kez kullanılan yöntem +5', () => {
    const old = entry({ venueKind: 'independent', placeName: 'Kör Nokta', createdAt: new Date(2026, 5, 1, 9).toISOString() });
    const back = scoreCup(input({ venueKind: 'independent', placeName: 'Kör Nokta' }), [old], new Date(2026, 6, 15, 9).toISOString());
    expect(back.parts.discovery).toBe(10); // yeniden keşif 5 + bu ay ilk espresso 5
    const sameMonth = scoreCup(input({ venueKind: 'independent', placeName: 'Kör Nokta' }), [old], new Date(2026, 5, 20, 9).toISOString());
    expect(sameMonth.parts.discovery).toBe(0); // 19 gün: dönüş puanı yok; espresso bu ay zaten içilmiş
  });

  it('arada başka mekan varsa seri bozulur', () => {
    const s = { venueKind: 'chain' as const, placeName: 'Starbucks' };
    const h = [entry(s), entry({ venueKind: 'home' }), entry(s)];
    expect(scoreCup(input(s), h).parts.selectivity).toBe(0);
  });

  it('detay: 2 tat notu ve menşei derinlik verir; skor 100ü geçmez', () => {
    const r = scoreCup(
      input({ method: 'filter', venueKind: 'home', notes: ['fruity', 'bright'], origin: 'Etiyopya' }),
      [],
    );
    expect(r.parts.depth).toBe(10);
    expect(r.total).toBe(85);
    const big = scoreCup(
      input({ method: 'filter', venueKind: 'independent', placeName: 'Yeni Yer', notes: ['fruity', 'bright'], origin: 'Kenya' }),
      [],
    );
    expect(big.total).toBeLessThanOrEqual(100);
  });
});

describe('keşif sınırları', () => {
  // 16 Kasım 2026 Pazartesi
  const mon = (d: number, h = 10) => new Date(2026, 10, d, h).toISOString();
  const indep = (name: string, createdAt: string) => entry({ venueKind: 'independent', placeName: name, createdAt });

  it('yeni mekan puanı haftada en fazla 2 kez', () => {
    const week = [indep('A', mon(16)), indep('B', mon(17))];
    const third = scoreCup(input({ venueKind: 'independent', placeName: 'C' }), week, mon(18));
    expect(third.parts.discovery).toBe(0); // yöntem de yeni değil (espresso)
    const nextWeek = scoreCup(input({ venueKind: 'independent', placeName: 'C' }), week, mon(23));
    expect(nextWeek.parts.discovery).toBe(15); // aynı ay: yöntem puanı yok
  });

  it('zincirin başka şubesi yeni mekan sayılmaz', () => {
    const h = [entry({ venueKind: 'chain', placeName: 'Starbucks Kadıköy', createdAt: mon(16) })];
    expect(scoreCup(input({ venueKind: 'chain', placeName: 'Starbucks Moda' }), h, mon(17)).parts.discovery).toBe(0);
  });

  it('aynı tat notu iki kez sayılmaz', () => {
    expect(scoreCup(input({ notes: ['bold', 'bold'] }), [entry({})]).parts.depth).toBe(0);
  });
});

describe('seviye etiketleri', () => {
  it.each([
    [0, 'Çaylak'],
    [39, 'Çaylak'],
    [40, 'Meraklı'],
    [60, 'Seçici'],
    [75, 'Uzman'],
    [90, 'Efsane'],
    [100, 'Efsane'],
  ])('%i → %s', (score, label) => expect(levelFor(score)).toBe(label));
});

describe('yeni mekan sınırı açıklaması', () => {
  const c = (createdAt: string, placeName: string) => ({ createdAt, placeName, venueKind: 'independent' as const });
  it('haftanın üçüncü yeni mekanı sınıra takılır, ilk ikisi takılmaz', () => {
    const all = [c('2026-11-23T09:00:00.000Z', 'A'), c('2026-11-24T09:00:00.000Z', 'B'), c('2026-11-25T09:00:00.000Z', 'C')];
    expect(newPlaceCapped(all[1], all)).toBe(false);
    expect(newPlaceCapped(all[2], all)).toBe(true);
  });
  it('daha önce gidilen mekan sınır sayılmaz', () => {
    const all = [c('2026-11-23T09:00:00.000Z', 'A'), c('2026-11-24T09:00:00.000Z', 'B'), c('2026-11-25T09:00:00.000Z', 'A')];
    expect(newPlaceCapped(all[2], all)).toBe(false);
  });
});
