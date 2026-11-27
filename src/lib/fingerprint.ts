import type { NoteShare } from './progress';

/**
 * Damak parmak izi: kahve fincanının bıraktığı halka izleri gibi iç içe dalgalı halkalar.
 * Her kullanıcıda farklı: halka sayısı fincan sayısından, dalgalar tat notlarından ve takma addan gelir.
 * Aynı veri her zaman aynı izi üretir (kart paylaşıldığında da değişmez). Saf fonksiyon, testli.
 */

/** Metinden 32 bitlik sabit bir sayı (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Sabit tohumlu basit rastgele sayı üreteci (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Ring = { d: string; width: number; opacity: number };

/**
 * Halkalar eş yükselti çizgileri gibidir: hepsi aynı yumuşak dalga şeklinin büyütülmüş kopyası,
 * bu yüzden asla birbirini kesmez ve aralar eşit kalır. Şekil tohumdan, dalga gücü tat notu çeşitliliğinden gelir.
 * İki çizgi kalınlığı dönüşümlü kullanılır.
 */
export function fingerprintRings(opts: { seed: string; cups: number; notes: NoteShare[]; radius: number; cx: number; cy: number }): Ring[] {
  const { seed, cups, notes, radius, cx, cy } = opts;
  const rand = rng(hashString(seed));
  const count = Math.max(4, Math.min(10, 4 + Math.floor(Math.log2(cups + 1))));
  // Tat notu çeşitliliği dalgaları güçlendirir: hiç not yoksa sakin, çok notluysa daha hareketli halkalar.
  const variety = Math.min(1, notes.length / 4);
  const f1 = 2 + Math.floor(rand() * 3);
  const f2 = 5 + Math.floor(rand() * 3);
  const a1 = 0.025 + rand() * 0.015 + variety * 0.015; // en fazla ~0.055
  const a2 = 0.008 + rand() * 0.01 + (notes[0]?.pct ?? 0) / 10000; // en fazla ~0.028
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const rings: Ring[] = [];
  const N = 120;
  for (let k = 0; k < count; k++) {
    const base = radius * (0.38 + (0.62 * (k + 1)) / count);
    // Dışa doğru dalga biraz artar (iç halkalar daha düzgün), şekil aynı kalır
    const g = 0.6 + (0.4 * (k + 1)) / count;
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const r = base * (1 + g * (a1 * Math.sin(f1 * t + p1) + a2 * Math.sin(f2 * t + p2)));
      pts.push(`${i ? 'L' : 'M'}${(cx + r * Math.cos(t)).toFixed(2)},${(cy + r * Math.sin(t)).toFixed(2)}`);
    }
    const strong = (count - 1 - k) % 2 === 0; // en dıştaki halka kalın
    rings.push({ d: `${pts.join(' ')} Z`, width: strong ? 1.6 : 0.9, opacity: strong ? 0.9 : 0.5 });
  }
  return rings;
}

/** Kart numarası: tanıtım tarihinden sabit 4 haneli sayı ("No. 0427"). */
export function memberNo(onboardedAt: string | undefined | null): string {
  return String((hashString(onboardedAt ?? 'cupped') % 9000) + 1000);
}
