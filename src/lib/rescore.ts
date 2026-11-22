import { computePalateTypeId } from './palate';
import { scoreCup } from './scoring';
import type { CupEntry } from './types';

/**
 * Bir fincan silinince ya da düzenlenince, ondan SONRAKİ fincanların geçmişe bağlı kısımları yenilenir:
 * keşif puanı (ilk kez gidilen mekan / denenen yöntem) ve damak tipi. Emek, derinlik ve eski "Rutin"
 * gibi diğer parçalar kayıttaki haliyle kalır; skorlar anlık görüntü olarak korunur, yalnızca tutarsızlık düzelir.
 * Saf fonksiyon: yeni liste döner (sıra korunur).
 */
export function rescoreAfter(list: CupEntry[], fromIso: string): CupEntry[] {
  const chrono = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const updated = new Map<string, CupEntry>();
  const done: CupEntry[] = [];
  for (const e of chrono) {
    if (e.createdAt > fromIso) {
      const r = scoreCup(e, done, e.createdAt);
      const parts = { ...e.parts, discovery: r.parts.discovery };
      const total = Math.max(0, Math.min(100, parts.base + parts.effort + parts.depth + parts.discovery + parts.selectivity));
      const palateTypeId = computePalateTypeId([...done, e]);
      if (total !== e.score || parts.discovery !== e.parts.discovery || palateTypeId !== e.palateTypeId) {
        const next = { ...e, parts, score: total, palateTypeId };
        updated.set(e.id, next);
        done.push(next);
        continue;
      }
    }
    done.push(e);
  }
  return updated.size ? list.map((e) => updated.get(e.id) ?? e) : list;
}
