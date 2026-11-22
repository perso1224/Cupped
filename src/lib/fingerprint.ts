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

export function fingerprintRings(opts: { seed: string; cups: number; notes: NoteShare[]; radius: number; cx: number; cy: number }): Ring[] {
  const { seed, cups, notes, radius, cx, cy } = opts;
  const rand = rng(hashString(seed));
  const count = Math.max(4, Math.min(10, 4 + Math.floor(Math.log2(cups + 1))));
  // Tat notu çeşitliliği dalgaları güçlendirir: hiç not yoksa sakin, çok notluysa daha hareketli halkalar.
  const variety = Math.min(1, notes.length / 4);
  const rings: Ring[] = [];
  for (let k = 0; k < count; k++) {
    const base = radius * (0.22 + (0.78 * (k + 1)) / count);
    const f1 = 2 + Math.floor(rand() * 4);
    const f2 = 5 + Math.floor(rand() * 5);
    const a1 = 0.015 + rand() * 0.03 + variety * 0.02;
    const a2 = 0.005 + rand() * 0.015 + (notes[k % Math.max(1, notes.length)]?.pct ?? 0) / 4000;
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    const pts: string[] = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const r = base * (1 + a1 * Math.sin(f1 * t + p1) + a2 * Math.sin(f2 * t + p2));
      pts.push(`${i ? 'L' : 'M'}${(cx + r * Math.cos(t)).toFixed(2)},${(cy + r * Math.sin(t)).toFixed(2)}`);
    }
    rings.push({ d: `${pts.join(' ')} Z`, width: 0.8 + rand() * 1.6, opacity: 0.25 + ((k % 3) / 2) * 0.55 });
  }
  return rings;
}

/** Kart numarası: tanıtım tarihinden sabit 4 haneli sayı ("No. 0427"). */
export function memberNo(onboardedAt: string | undefined | null): string {
  return String((hashString(onboardedAt ?? 'cupped') % 9000) + 1000);
}
