import { PALATE_RULES } from '../config/scoring.config';
import { createPalateTracker, palateStep } from './palate';
import { addToIndex, createHistoryIndex, discoveryPoints } from './scoring';
import type { CupEntry } from './types';

/**
 * Bir fincan eklenince (geçmişe), silinince ya da düzenlenince, ondan SONRAKİ fincanların geçmişe bağlı
 * kısımları yenilenir: keşif puanı (ilk kez gidilen mekan / denenen yöntem) ve damak tipi. Emek, derinlik ve
 * diğer parçalar kayıttaki haliyle kalır; yalnızca tutarsızlık düzelir.
 * Tek geçişte çalışır (geçmiş özeti adım adım büyür), binlerce fincanda da hızlıdır.
 * Saf fonksiyon: yeni liste döner (sıra korunur).
 */
export function rescoreAfter(list: CupEntry[], fromIso: string): CupEntry[] {
  const chrono = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const updated = new Map<string, CupEntry>();
  const ix = createHistoryIndex();
  const tracker = createPalateTracker(); // kararlı damak tipi baştan itibaren izlenir
  const done: CupEntry[] = [];
  for (const e of chrono) {
    let cur = e;
    const stableType = palateStep(tracker, [...done.slice(-(PALATE_RULES.window - 1)), e]);
    if (e.createdAt > fromIso) {
      const discovery = discoveryPoints(e, ix, e.createdAt);
      const parts = { ...e.parts, discovery };
      const total = Math.max(0, Math.min(100, parts.base + parts.effort + parts.depth + parts.discovery + parts.selectivity));
      const palateTypeId = stableType;
      if (total !== e.score || discovery !== e.parts.discovery || palateTypeId !== e.palateTypeId) {
        cur = { ...e, parts, score: total, palateTypeId };
        updated.set(e.id, cur);
      }
    }
    addToIndex(ix, cur);
    done.push(cur);
  }
  return updated.size ? list.map((e) => updated.get(e.id) ?? e) : list;
}
