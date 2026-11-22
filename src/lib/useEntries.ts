import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { cachedEntries, loadEntries, subscribeEntries } from './storage';
import type { CupEntry } from './types';

/**
 * Fincan listesi. Bellekteki listeden hemen gelir; kayıt/silme/düzenleme olunca kendiliğinden güncellenir.
 * Ekran görünür olduğunda da (ilk açılışta liste henüz okunmadıysa) telefondan okunur.
 */
export function useEntries() {
  const [entries, setEntries] = useState<CupEntry[] | null>(cachedEntries);
  useEffect(() => subscribeEntries(setEntries), []);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadEntries().then((list) => alive && setEntries(list));
      return () => {
        alive = false;
      };
    }, []),
  );
  return entries;
}
